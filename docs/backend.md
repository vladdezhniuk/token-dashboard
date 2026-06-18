# Backend Architecture

The Token Dashboard backend is a **NestJS 11 + TypeScript** application that serves ERC-20
transfer history and handles wallet-signature authentication. It is the single server-side
component in the system: the React (Vite) frontend talks to it **directly over HTTP/JSON**, because
the project deliberately ships **no Next.js gateway / BFF**. The frontend's `shared/api` layer is
the sole network boundary and calls NestJS directly — in development through the Vite dev-server
proxy (same-origin, so the `SameSite=Lax` auth cookie flows), and in production with CORS as a
fallback.

The backend is deliberately narrow in scope. Wallet connection, balance reads, and the actual
ERC-20 `transfer(to, amount)` transaction all happen **client-side** via the connected wallet +
viem. The backend's job is to:

- **Authenticate** a wallet via a signed-message (SIWE-style) flow and issue a session cookie.
- **Serve** transfer history for an address from Postgres (read-only over raw SQL).
- **Watch** on-chain `Transfer` events (currently log-only — see the
  [blockchain listener](#blockchain-listener) note).

The code follows a **light, loosely DDD-flavored module layout** — a thin NestJS structure of
controllers, services, DTOs, a guard, and a shared database layer. It is **not** a full
ports-and-adapters / hexagonal architecture: there are no domain aggregates, value objects, use
cases, mappers, or repository interfaces. When in doubt, the source under `api/src/` is the
contract.

> **No ORM.** The data layer is **vanilla `pg` (`Pool`) + raw SQL**. There is no Prisma, no
> TypeORM, no ORM of any kind anywhere in the backend.

---

## Stack

| Concern | Choice |
| --- | --- |
| Framework | NestJS 11 (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`) |
| Language | TypeScript 5.7 |
| Runtime / package manager | Bun (monorepo workspaces) |
| Database | PostgreSQL **18** (native `uuidv7()` for primary keys) |
| DB driver | `pg` (`Pool`) + raw SQL — **no ORM** |
| Auth | `@nestjs/jwt` + `cookie-parser`; wallet-signature verification via viem `verifyMessage` |
| Blockchain | `viem` (`createPublicClient`, `getContract`, `erc20Abi`, Sepolia chain) |
| Validation | `class-validator` + `class-transformer` via a global `ValidationPipe` |
| Config | `@nestjs/config` (`ConfigModule.forRoot({ isGlobal: true })`) + `dotenv/config` |

There is **no Swagger** in the project (no `@nestjs/swagger` dependency).

---

## Folder Structure

The actual layout of `api/src`. Each feature is a small NestJS module; `shared/db` holds the
cross-cutting database layer, and `infrastructure/blockchain` holds the on-chain event watcher.

```text
api/
├── db/
│   ├── users.schema.sql                # users table (wallet login)
│   ├── transfers.schema.sql            # transfers table + from/to indexes
│   └── transfers.seed.sql              # mock transfer history for local dev
│
└── src/
    ├── main.ts                         # bootstrap: dotenv, cookieParser, ValidationPipe, CORS, listen(PORT)
    ├── app.module.ts                   # root module: Auth, Jwt, Config, Transfers, Database + global AuthGuard + NodeListener
    │
    ├── shared/
    │   └── db/
    │       ├── database.module.ts      # @Global() module exporting DatabaseService
    │       └── database.service.ts     # pg Pool wrapper: query() / connect() / onModuleDestroy
    │
    ├── infrastructure/
    │   └── blockchain/
    │       └── node.listener.service.ts  # NodeListener: viem watchEvent.Transfer (LOG-ONLY, see note)
    │
    └── modules/
        ├── auth/
        │   ├── auth.module.ts           # controllers: [AuthController]; providers: [AuthService]
        │   ├── auth.controller.ts       # @Controller('auth'): GET /nonce, POST /sign-in, GET /me
        │   ├── auth.service.ts          # signIn(): verifyMessage -> upsert user -> sign JWT
        │   ├── auth.guard.ts            # global AuthGuard: reads access_token cookie, verifies JWT
        │   ├── auth.decorator.ts        # @Public() = SetMetadata('isPublic', true)
        │   └── dto/
        │       └── auth.dto.ts          # AuthDto { address, signature }
        │
        └── transfers/
            ├── transfers.module.ts      # controllers: [TransfersController]; providers: [TransfersService]
            ├── transfers.controller.ts  # @Controller('transfers'): GET /
            ├── transfers.service.ts     # getTransfers(address, direction?) via raw SQL
            └── dto/
                └── getTransfers.dto.ts  # GetTransfersDto { address, type? }
```

---

## Bootstrap (`main.ts`)

`main.ts` loads environment variables **first** (the very first line is `import 'dotenv/config'`,
so `.env` is available before Nest resolves any module), then wires the global middleware:

```ts
// src/main.ts
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

- **`dotenv/config`** is imported on line 1 so `process.env` is populated before module resolution.
- **`cookieParser()`** is registered — required so the `AuthGuard` can read the `access_token`
  cookie off `request.cookies`.
- **Global `ValidationPipe`** with `{ whitelist: true, transform: true }`: `whitelist` strips
  properties that have no decorator; `transform` coerces the incoming payload into the DTO class
  instance. (Note: `forbidNonWhitelisted` is **not** set, so extra properties are stripped, not
  rejected with a 400.)
- **CORS**: origin from `FRONTEND_URL` (default `http://localhost:5173`), `credentials: true` so the
  session cookie is allowed cross-origin. This is the fallback path; in dev the Vite proxy makes
  requests same-origin.
- **Listen** on `PORT` (default `3000`).

---

## Root Module (`app.module.ts`)

```ts
// src/app.module.ts
@Module({
  imports: [
    AuthModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    TransfersModule,
    DatabaseModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    NodeListener,
  ],
})
export class AppModule {}
```

Key points:

- **`JwtModule.register({ global: true, ... })`** — registered globally with the `JWT_SECRET` secret
  and a `1d` token expiry, so `JwtService` is injectable anywhere.
- **`ConfigModule.forRoot({ isGlobal: true })`** — makes `ConfigService` global (used by
  `DatabaseService` to read `DATABASE_URL`).
- **`DatabaseModule`** is `@Global()`, so `DatabaseService` is available everywhere without
  re-importing.
- **Global guard** — `{ provide: APP_GUARD, useClass: AuthGuard }` applies `AuthGuard` to **every**
  route by default; routes opt out with `@Public()`.
- **`NodeListener`** is registered as a provider so its `onModuleInit` starts the on-chain watcher
  at boot.

---

## Authentication

A passwordless, wallet-signature flow (SIWE-style). The wallet proves ownership of an address by
signing a fixed nonce message; the server verifies the signature, upserts the user, and issues a
JWT delivered as an **httpOnly cookie** (not a bearer token).

### Endpoints (`auth.controller.ts`, `@Controller('auth')`)

| Method & path | Access | Body / query | Returns |
| --- | --- | --- | --- |
| `GET /auth/nonce` | `@Public()` | — | The `WALLET_SIGN_NONCE` value as a **plain string** (the message the wallet must sign). |
| `POST /auth/sign-in` | `@Public()` | `{ address, signature }` | Nothing in the body. Sets the `access_token` httpOnly cookie on success. |
| `GET /auth/me` | Protected (global guard) | — | `{ address }` derived from the verified JWT. Lets the frontend restore a session without re-prompting the wallet. |

The access cookie is configured as:

```ts
const ACCESS_COOKIE = 'access_token';
const accessCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // secure only in production
  sameSite: 'lax' as const,
  maxAge: 1000 * 60 * 60 * 24,                    // 1 day
  path: '/',
};
```

`SameSite=Lax` is why the dev-server proxy matters: requests must look same-origin (port `5173`)
for the browser to send the cookie.

### Sign-in flow (`auth.service.ts`)

```ts
async signIn(address: string, signature: string): Promise<string> {
  const verified = await verifyMessage({
    address: address as `0x${string}`,
    message: process.env.WALLET_SIGN_NONCE!,
    signature: signature as `0x${string}`,
  });
  if (!verified) throw new UnauthorizedException();

  // Upsert: insert the wallet, ignore the unique-violation (23505) if it already exists.
  try {
    await this.db.query('insert into users (wallet_address) values ($1)', [address.toLowerCase()]);
  } catch (error) {
    if (error.code !== '23505') throw error;
  }

  const { rows } = await this.db.query(
    'select * from users where wallet_address = $1',
    [address.toLowerCase()],
  );
  const userId = rows[0].id;

  const payload = { sub: userId, address: address.toLowerCase() };
  return await this.jwt.signAsync(payload);
}
```

- The signature is verified with viem's **`verifyMessage`** against the static `WALLET_SIGN_NONCE`
  message.
- The wallet address is **lower-cased** before it touches the database (insert + lookup).
- The unique-constraint violation (`23505`) on `users.wallet_address` is swallowed so repeat
  sign-ins are idempotent.
- The **JWT payload** is `{ sub: userId, address: address.toLowerCase() }` — note that `address` is
  included alongside the subject, which is what `GET /auth/me` returns.

### Guard (`auth.guard.ts`)

`AuthGuard` is the global `APP_GUARD`:

```ts
async canActivate(context: ExecutionContext) {
  const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
    context.getHandler(), context.getClass(),
  ]);
  if (isPublic) return true;

  const request = context.switchToHttp().getRequest<Request>();
  const token = request.cookies?.['access_token'];
  if (!token) throw new UnauthorizedException();

  try {
    const tokenPayload = await this.jwtService.verifyAsync(token);
    request['user'] = { userId: tokenPayload.sub, address: tokenPayload.address };
    return true;
  } catch {
    throw new UnauthorizedException();
  }
}
```

- Routes decorated with `@Public()` (which sets `isPublic` metadata via `SetMetadata`) bypass the
  guard.
- The token is read from the **`access_token` cookie** (not an `Authorization` header).
- On success it verifies the JWT with `JwtService.verifyAsync` and attaches
  `request.user = { userId, address }`.
- Any failure (missing or invalid token) throws **401 Unauthorized**.

### `@Public()` decorator (`auth.decorator.ts`)

```ts
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

### `AuthDto` (`dto/auth.dto.ts`)

```ts
export class AuthDto {
  @IsString()
  signature: string;

  @IsEthereumAddress()
  address: string;
}
```

---

## Transfers

Read-only transfer history for an address. There is **no write endpoint** — the backend does not
expose a `POST /transfers`. History rows are populated by seeding (and would, in future, be
populated by the on-chain listener — see the [note](#blockchain-listener)).

### Endpoint (`transfers.controller.ts`, `@Controller('transfers')`)

| Method & path | Access | Query | Returns |
| --- | --- | --- | --- |
| `GET /transfers` | Protected (global guard) | `GetTransfersDto` `{ address, type? }` | `Transfer[]`, newest first. |

```ts
@Controller('transfers')
export class TransfersController {
  constructor(private readonly service: TransfersService) {}

  @Get('/')
  public async getTransfers(@Query() query: GetTransfersDto): Promise<Transfer[]> {
    return await this.service.getTransfers(query.address, query.type);
  }
}
```

The route is protected by the **global** `AuthGuard` (it is not decorated `@Public()`), so a valid
`access_token` cookie is required.

### Query DTO (`dto/getTransfers.dto.ts`)

```ts
export class GetTransfersDto {
  @IsEthereumAddress()
  address: string;

  @IsOptional()
  @IsIn(['sent', 'received'])
  type?: string;
}
```

- `address` — required, must be a valid EVM address.
- `type` — optional; when present must be `'sent'` or `'received'` (filters the direction).

### Service (`transfers.service.ts`)

```ts
export interface Transfer {
  id: string;          // uuid (uuidv7)
  address_from: string;
  address_to: string;
  amount: string;
  tx_hash: string;
  created_at: Date;
}

export type TransferDirection = 'sent' | 'received';

const COLUMN_BY_DIRECTION: Record<TransferDirection, string> = {
  sent: 'address_from',
  received: 'address_to',
};

async getTransfers(address: string, direction?: string): Promise<Transfer[]> {
  const type = direction ? COLUMN_BY_DIRECTION[direction] : '';
  const where = type
    ? `${type} = $1`
    : `address_from = $1 or address_to = $1`;

  const { rows } = await this.db.query<Transfer>(
    `select * from transfers where ${where} order by created_at desc`,
    [address.toLowerCase()],
  );
  return rows;
}
```

- **Direction filter**: `sent` → matches `address_from`; `received` → matches `address_to`; no
  direction → matches `address_from = $1 OR address_to = $1`.
- Results are ordered **`created_at DESC`** (newest first).
- The address is **lower-cased** before the query (matching how rows are stored).
- The SQL is parameterized (`$1`) — the only dynamic SQL is the column/`where` clause, which is
  selected from a fixed map, not from user input.

---

## Database Layer

Vanilla `pg` with raw SQL. The `DatabaseService` owns a single connection `Pool` and exposes a thin
`query` helper. There is **no ORM, no migration tool, no query builder** — schema is applied from
the `.sql` files via the `db:schema` script.

### `DatabaseService` (`shared/db/database.service.ts`)

```ts
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor(config: ConfigService) {
    this.pool = new Pool({ connectionString: config.getOrThrow<string>('DATABASE_URL') });
  }

  query<T extends QueryResultRow>(sql: string, params?: unknown[]) {
    return this.pool.query<T>(sql, params);
  }

  connect(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
```

- The connection string comes from `DATABASE_URL` (`ConfigService.getOrThrow`, so a missing value
  fails fast at boot).
- `query()` returns the raw `pg` result (callers destructure `{ rows }`).
- `connect()` hands out a pooled client for any future transactional work.
- `onModuleDestroy` drains the pool on shutdown.

### `DatabaseModule` (`shared/db/database.module.ts`)

`@Global()`, providing and exporting `DatabaseService` so it is injectable across every module
without re-importing.

### Schema

Defined in `api/db/*.schema.sql` and applied with `bun run db:schema`. Postgres **18** is required
for the native **`uuidv7()`** default.

**`users`** (`api/db/users.schema.sql`):

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `UUID` | PK, default `uuidv7()` |
| `wallet_address` | `TEXT` | `NOT NULL UNIQUE` (stored lower-cased) |
| `created_at` | `TIMESTAMPTZ(3)` | `NOT NULL DEFAULT now()` |

Plus `users_ids` index on `id`.

**`transfers`** (`api/db/transfers.schema.sql`):

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `UUID` | PK, default `uuidv7()` |
| `address_from` | `TEXT` | `NOT NULL` |
| `address_to` | `TEXT` | `NOT NULL` |
| `amount` | `NUMERIC` | `NOT NULL` (human-readable token value) |
| `tx_hash` | `TEXT` | `NOT NULL UNIQUE` |
| `created_at` | `TIMESTAMPTZ(3)` | `NOT NULL DEFAULT now()` |

Plus `transfers_from_idx` on `address_from` and `transfers_to_idx` on `address_to` to support the
direction queries.

A seed file (`api/db/transfers.seed.sql`) provides mock history for local UI testing. It is
idempotent (`ON CONFLICT (tx_hash) DO NOTHING`) and uses lower-cased Hardhat default accounts as the
subject/counterparties.

See [Database Schema](./database.md) for the full reference and
[Postgres Setup](./postgres-setup.md) for local provisioning.

---

## Blockchain Listener

`NodeListener` (`infrastructure/blockchain/node.listener.service.ts`) subscribes to the on-chain
ERC-20 `Transfer` event using viem.

```ts
@Injectable()
export class NodeListener {
  public node = createPublicClient({ chain: sepolia, transport: http() });

  public contract = getContract({
    address: process.env.TOKEN_ADDRESS as `0x${string}`,
    abi: erc20Abi,
    client: this.node,
  });

  public watch() {
    log('transfer event watching started');
    return this.contract.watchEvent.Transfer({}, { onLogs: logs => log(`${logs}`) });
  }

  onModuleInit() {
    this.watch();
  }

  onModuleDestroy() {
    const unwatch = this.watch();
    unwatch();
  }
}
```

- Builds a viem **public client** for **Sepolia** over the default `http()` transport, and a
  contract handle for `TOKEN_ADDRESS` using viem's built-in `erc20Abi`.
- `onModuleInit` calls `watch()`, which starts a `watchEvent.Transfer` subscription.

> **Known gap / TODO — log-only.** The listener currently **only logs** events
> (`onLogs: logs => log(...)`). It does **not** persist anything to the `transfers` table; there is
> no call into `DatabaseService` or any transfer-writing code. Transfer history is populated by the
> seed file, not by this watcher. Persisting on-chain `Transfer` events (with dedupe on the unique
> `tx_hash`) is a future enhancement.
>
> Also note `onModuleDestroy` calls `watch()` a second time and immediately unsubscribes the *new*
> subscription, leaving the original one running — a minor bug worth fixing if the listener is
> wired up for real.

---

## Validation & Error Handling

Validation is DTO-level via `class-validator`, enforced by the global `ValidationPipe`.

| Field | Location | Rule | Decorator(s) |
| --- | --- | --- | --- |
| `address` (auth) | body | valid EVM address | `@IsEthereumAddress()` |
| `signature` (auth) | body | string | `@IsString()` |
| `address` (transfers) | query | valid EVM address | `@IsEthereumAddress()` |
| `type` (transfers) | query | optional; `'sent'` or `'received'` | `@IsOptional()` + `@IsIn([...])` |

Error responses use the standard NestJS HTTP-exception envelope (there is no custom global
exception filter in the project):

| Condition | Source | HTTP status |
| --- | --- | --- |
| Invalid / missing DTO field | `ValidationPipe` | **400 Bad Request** |
| Missing or invalid `access_token` cookie on a protected route | `AuthGuard` | **401 Unauthorized** |
| Signature fails `verifyMessage` | `AuthService.signIn` | **401 Unauthorized** |

The duplicate-wallet case (`23505`) is intentionally swallowed in `signIn`, so a returning wallet
signs in normally rather than erroring.

---

## Environment Variables (backend)

Backend variables are **server-only** — never prefixed `VITE_`. They live in `api/.env` (see
`api/.env.example`). Values are loaded by `import 'dotenv/config'` at the top of `main.ts`.

| Variable | Example / default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | Port the NestJS server listens on. |
| `FRONTEND_URL` | `http://localhost:5173` | CORS origin (Vite dev default). |
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/token_dashboard` | Postgres connection string for the `pg` pool. **Secret.** |
| `RPC_URL` | `http://127.0.0.1:8545` | RPC endpoint reference for blockchain access. (Note: `NodeListener` currently uses viem's default `http()` transport for Sepolia and does not read this var directly.) |
| `TOKEN_ADDRESS` | `0x...` | ERC-20 token address the listener watches. |
| `JWT_SECRET` | `...` | Secret for signing/verifying the session JWT. **Secret.** |
| `WALLET_SIGN_NONCE` | `...` | The fixed message returned by `GET /auth/nonce` and verified by `verifyMessage` during sign-in. |

Ports: backend = **3000** (NestJS), frontend dev = **5173** (Vite).

> Note: `WALLET_SIGN_NONCE` is read by `auth.controller.ts` and `auth.service.ts` and **must** be
> set for auth to work, even if it is not yet listed in `api/.env.example`.

---

## Running & Scripts

The backend is part of a **Bun-workspaces monorepo**. From the repo root:

| Command | What it does |
| --- | --- |
| `bun run setup` | Install root + `app/` + `api/` dependencies. |
| `bun run dev` | `concurrently` runs the API (`cd api && bun run start:dev`) and the web app (`cd app && bun run dev`). |
| `bun run db:up` / `db:stop` / `db:logs` / `db:psql` / `db:schema` / `db:reset` | Delegate to the matching `api/` script. |

The root delegates DB scripts to `api/package.json`, which manages a **Podman** Postgres 18
container named `token-dashboard-db`:

| `api` script | What it does |
| --- | --- |
| `db:up` | Start (or first-run `podman run`) the `token-dashboard-db` container on `postgres:18`, port `5432`. |
| `db:stop` | Stop the container. |
| `db:logs` | Follow container logs. |
| `db:psql` | Open a `psql` shell inside the container. |
| `db:schema` | Pipe `db/*.schema.sql` into `psql` (apply schema). |
| `db:seed` | Pipe `db/*.seed.sql` into `psql` (load mock data). |
| `db:reset` | Remove the container + volume, then `db:up` (fresh database). |
| `start` / `start:dev` / `start:prod` | `nest start` / `nest start --watch` / `node dist/main`. |
| `build` | `nest build`. |
| `test` / `test:e2e` / `test:cov` | Jest unit / e2e / coverage. |

(Note: `db:seed` exists in `api/package.json` but is not re-exported at the repo root; run it from
`api/` or via `cd api && bun run db:seed`.)

---

## Related Documentation

- [Frontend Architecture (FSD)](./frontend.md)
- [REST API Reference](./api-reference.md)
- [Database Schema](./database.md)
- [Postgres Setup](./postgres-setup.md)
