# Database

The Token Dashboard persists wallet logins and ERC-20 transfer history in **PostgreSQL 18**, accessed through a thin **vanilla [`pg`](https://node-postgres.com/) connection pool with raw SQL**. There is **no ORM** — no Prisma, no TypeORM. Every query is hand-written SQL run through a single `DatabaseService`.

Database access is still a clear boundary, just a simpler one than a full repository abstraction:

- The **frontend** (`/app`) never sees Postgres. It speaks HTTP/JSON to NestJS through the FSD `shared/api` layer (the single network boundary). See [Frontend (FSD)](./frontend.md). The React app calls the NestJS API directly — there is **no Next.js gateway/BFF**.
- The **backend** (`/api`, NestJS) is the only thing that talks to the database. A single `@Global()` `DatabaseModule` exposes one injectable `DatabaseService`, and the feature services (`AuthService`, `TransfersService`) call `db.query(sql, params)` directly.

```mermaid
flowchart LR
  FE["React Frontend<br/>(shared/api)"] -- HTTP/JSON --> C["Controllers + DTOs<br/>(auth, transfers)"]
  C --> S["Feature services<br/>AuthService / TransfersService"]
  S -- db.query(sql, params) --> DBS["DatabaseService<br/>(pg Pool, raw SQL)"]
  DBS --> DB[("PostgreSQL 18<br/>users · transfers")]
```

> Only backend code reaches the database, and it does so through `DatabaseService`. This matches the layered architecture in [Backend (DDD)](./backend.md) — but note the data layer is deliberately a raw-SQL pool, not a generated client or repository/mapper stack.

---

## Data-access layer (`pg` + raw SQL)

The entire data layer lives in two files under `api/src/shared/db/`:

- **`database.module.ts`** — a `@Global()` module that provides and exports `DatabaseService`, so any feature module can inject it without re-importing.
- **`database.service.ts`** — wraps a single `pg.Pool`. The connection string comes from `DATABASE_URL` (read via Nest's `ConfigService.getOrThrow`). It exposes `query()`, `connect()` (for a pooled client when a transaction is needed), and closes the pool on shutdown.

```ts
// api/src/shared/db/database.service.ts
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';

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

Always pass user input as parameters (`$1`, `$2`, …), never string-interpolated, so `pg` does the escaping and the query stays injection-safe.

---

## Schema

The schema is plain `.sql` files in `api/db/`, applied with `psql` (see [Applying the schema](#applying-the-schema)). There is no migration tool — the schema files are the source of truth and are written idempotently (`CREATE TABLE IF NOT EXISTS`).

Both primary keys use **Postgres 18's native `uuidv7()`** default. UUIDv7 is time-ordered, so a freshly generated `id` is roughly monotonic, which keeps index inserts cheap while still being a non-guessable surrogate key.

### Table: `users`

Wallet-based login. One row per wallet that has signed in. Defined in `api/db/users.schema.sql`.

```sql
-- api/db/users.schema.sql
CREATE TABLE IF NOT EXISTS users (
    id             UUID           PRIMARY KEY DEFAULT uuidv7(),
    wallet_address TEXT           NOT NULL UNIQUE,
    created_at     TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_ids ON users (id);
```

| Column           | Type            | Constraints                       | Notes                                                                       |
| ---------------- | --------------- | --------------------------------- | --------------------------------------------------------------------------- |
| `id`             | `uuid`          | `PRIMARY KEY`, `DEFAULT uuidv7()` | Time-ordered UUIDv7 surrogate key.                                          |
| `wallet_address` | `text`          | `NOT NULL`, **`UNIQUE`**          | EVM address (`0x` + 40 hex), stored **lower-cased** by `AuthService`.        |
| `created_at`     | `timestamptz(3)`| `NOT NULL`, `DEFAULT now()`       | First sign-in time. Millisecond precision (`(3)`), timezone-aware.          |

`UNIQUE(wallet_address)` is what makes sign-in an idempotent upsert: `AuthService.signIn` runs a plain `INSERT`, and if the wallet already exists Postgres raises unique-violation code `23505`, which the service swallows before selecting the existing row (see [Auth flow](#auth-flow)).

### Table: `transfers`

ERC-20 transfer history. Each row is one transfer between two addresses. Defined in `api/db/transfers.schema.sql`.

```sql
-- api/db/transfers.schema.sql
CREATE TABLE IF NOT EXISTS transfers (
    id           UUID           PRIMARY KEY DEFAULT uuidv7(),
    address_from TEXT           NOT NULL,
    address_to   TEXT           NOT NULL,
    amount       NUMERIC        NOT NULL,
    tx_hash      TEXT           NOT NULL UNIQUE,
    created_at   TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transfers_from_idx ON transfers (address_from);
CREATE INDEX IF NOT EXISTS transfers_to_idx   ON transfers (address_to);
```

| Column         | Type             | Constraints                       | API field      | Notes                                                                  |
| -------------- | ---------------- | --------------------------------- | -------------- | ---------------------------------------------------------------------- |
| `id`           | `uuid`           | `PRIMARY KEY`, `DEFAULT uuidv7()` | `id`           | Time-ordered UUIDv7 surrogate key.                                    |
| `address_from` | `text`           | `NOT NULL`, indexed               | `address_from` | Sender EVM address (`0x` + 40 hex). Indexed for history queries.      |
| `address_to`   | `text`           | `NOT NULL`, indexed               | `address_to`   | Recipient EVM address (`0x` + 40 hex). Indexed for history queries.   |
| `amount`       | `numeric`        | `NOT NULL`                        | `amount`       | Token amount as exact `NUMERIC` (no float rounding).                  |
| `tx_hash`      | `text`           | `NOT NULL`, **`UNIQUE`**          | `tx_hash`      | On-chain transaction hash (`0x` + 64 hex). Natural dedupe key.       |
| `created_at`   | `timestamptz(3)` | `NOT NULL`, `DEFAULT now()`       | `created_at`   | Set by the DB on insert. Serialized as ISO-8601 in the API response. |

The API returns rows **as-is** — the `GET /transfers` response objects use the raw `snake_case` column names (`id`, `address_from`, `address_to`, `amount`, `tx_hash`, `created_at`); there is no row-to-DTO field remapping. See [API Reference](./api-reference.md). The TypeScript `Transfer` shape mirrors the table:

```ts
// api/src/modules/transfers/transfers.service.ts
export interface Transfer {
  id: string;
  address_from: string;
  address_to: string;
  amount: string;     // NUMERIC arrives from pg as a string (precision-safe)
  tx_hash: string;
  created_at: Date;
}
```

> `pg` returns `NUMERIC` columns as JavaScript **strings** by default to avoid precision loss, which is why `amount` is typed `string` in TypeScript even though the column is numeric.

---

## Why these constraints and indexes

Every constraint and index serves a concrete query in the app:

- **`tx_hash` is `UNIQUE`.** A transaction hash uniquely identifies a settled on-chain transfer, so the unique constraint guarantees the same transfer can never be stored twice — the database itself rejects the duplicate. The dev seed relies on this (`ON CONFLICT (tx_hash) DO NOTHING`), and it is the safety net for any future ingestion path that re-processes overlapping block ranges.
- **`wallet_address` is `UNIQUE`.** Backs the idempotent sign-in upsert: one wallet ⇒ at most one `users` row, and a repeated sign-in just re-reads the existing row instead of creating a duplicate.
- **Indexes on `address_from` and `address_to`.** The primary read query is `GET /transfers?address=0x...`, which returns every transfer where `address_from == address` **OR** `address_to == address`. Without indexes that is a full table scan per request; with `transfers_from_idx` and `transfers_to_idx`, Postgres can satisfy each side of the `OR` via an index lookup, keeping history queries fast as the table grows.
- **`created_at` default + `DESC` sort.** `DEFAULT now()` stamps every row at insert time with no application code involved, and the history query sorts by `created_at DESC` so the UI renders **newest transfers first**.

---

## How the services use the database

There is no repository/mapper layer — feature services run SQL directly through the injected `DatabaseService`.

### Transfers query

`TransfersService.getTransfers(address, direction?)` builds the `WHERE` clause from an optional direction and lower-cases the address before binding it:

```ts
// api/src/modules/transfers/transfers.service.ts
export type TransferDirection = 'sent' | 'received';

const COLUMN_BY_DIRECTION: Record<TransferDirection, string> = {
  sent: 'address_from',
  received: 'address_to',
};

public async getTransfers(address: string, direction?: string): Promise<Transfer[]> {
  const type = direction ? COLUMN_BY_DIRECTION[direction] : '';
  const where = type
    ? `${type} = $1`                              // 'sent' -> address_from, 'received' -> address_to
    : `address_from = $1 or address_to = $1`;     // no direction -> both sides

  const { rows } = await this.db.query<Transfer>(
    `select * from transfers where ${where} order by created_at desc`,
    [address.toLowerCase()],
  );
  return rows;
}
```

- The address is always **lower-cased** before binding, matching how addresses are stored (the auth upsert and the seed data are both lower-cased).
- `direction` is constrained to `'sent' | 'received'` by the controller DTO (`@IsIn(['sent', 'received'])`), so the column name pulled from `COLUMN_BY_DIRECTION` is never attacker-controlled; the address itself is always a bound parameter.
- Exposed via `GET /transfers` (`TransfersController`), protected by the global `AuthGuard`. Query DTO: `{ address: <EVM address>, type?: 'sent' | 'received' }`. There is **no** `POST /transfers` write endpoint — the API is read-only over this table. See [API Reference](./api-reference.md).

### Auth flow

`AuthService.signIn(address, signature)` verifies the wallet signature with viem, then upserts the user and issues a JWT:

```ts
// api/src/modules/auth/auth.service.ts
const verified = await verifyMessage({
  address: address as `0x${string}`,
  message: process.env.WALLET_SIGN_NONCE!,
  signature: signature as `0x${string}`,
});
if (!verified) throw new UnauthorizedException();

try {
  await this.db.query('insert into users (wallet_address) values ($1)', [address.toLowerCase()]);
} catch (error) {
  if (error.code !== '23505') throw error; // ignore unique violation (user already exists)
}

const { rows } = await this.db.query(`select * from users where wallet_address = $1`, [address.toLowerCase()]);
const userId = rows[0].id;

const payload = { sub: userId, address: address.toLowerCase() }; // JWT payload
return await this.jwt.signAsync(payload);
```

The JWT (signed with `JWT_SECRET`, 1-day expiry) is set as the httpOnly `access_token` cookie (`SameSite=Lax`). The full SIWE flow and the `GET /auth/nonce` / `POST /auth/sign-in` / `GET /auth/me` endpoints are documented in [Backend (DDD)](./backend.md) and [API Reference](./api-reference.md).

> **Blockchain listener (current state).** `NodeListener` (`api/src/infrastructure/blockchain/node.listener.service.ts`) watches ERC-20 `Transfer` events on Sepolia via viem's `watchEvent.Transfer`, but it currently **only logs** the events to the console — it does **not** write them into the `transfers` table. Persisting watched events is a known gap/TODO; today the only way rows get into `transfers` is the dev seed below.

---

## Local setup

The database runs in a Postgres 18 container managed by **Podman**, driven by `db:*` scripts. Run them either from `/api` directly or from the repo root (the root `package.json` delegates to `api`):

```bash
# from the repo root (delegates into api/)
bun run db:up      # start (or create) the token-dashboard-db container
bun run db:schema  # apply api/db/*.schema.sql
bun run db:reset   # destroy container + volume, then recreate
```

The matching scripts in `api/package.json`:

| Script       | What it does                                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------- |
| `db:up`      | Start `token-dashboard-db`, or `podman run` it on `docker.io/library/postgres:18` (user `user` / pass `pass` / db `token_dashboard`, port `5432`, named volume `token_dashboard_pgdata`). |
| `db:stop`    | `podman stop token-dashboard-db`.                                                                                   |
| `db:logs`    | Follow container logs.                                                                                              |
| `db:psql`    | Open a `psql` shell inside the container (`-U user -d token_dashboard`).                                            |
| `db:schema`  | Pipe `db/*.schema.sql` into `psql` to (re)create the tables (`-v ON_ERROR_STOP=1`).                                 |
| `db:seed`    | Pipe `db/*.seed.sql` into `psql` to load mock data.                                                                 |
| `db:reset`   | `podman rm -f` the container, remove the volume, then `db:up` (fresh empty DB). Re-run `db:schema` afterward.       |

`DATABASE_URL` is read from `/api/.env` (server-only — never committed with real credentials, never `VITE_`-prefixed). The default for the container above:

```dotenv
# /api/.env
DATABASE_URL=postgresql://user:pass@localhost:5432/token_dashboard
```

The connection string format is `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`. Postgres listens on port **5432**. For step-by-step container setup and troubleshooting, see [Postgres setup](./postgres-setup.md).

---

## Seeding (optional)

`api/db/transfers.seed.sql` pre-populates the `transfers` table with mock history for local/UI testing. The subject wallet is Hardhat account #0; counterparties are the other default Hardhat accounts. Run it with:

```bash
bun run db:seed
```

The seed is **idempotent**: each row has a deterministic `tx_hash` and the insert ends with `ON CONFLICT (tx_hash) DO NOTHING`, so re-running it is a no-op. Addresses are stored **lower-cased** to match how `TransfersService` looks rows up. Seeding is for local/demo only — it is never run in production.

---

## See also

- [Backend (DDD)](./backend.md) — the layered architecture and where the data layer sits.
- [API Reference](./api-reference.md) — the REST contract and the `transfers` response shape this table maps to.
- [Postgres setup](./postgres-setup.md) — container provisioning, applying the schema, and troubleshooting.
