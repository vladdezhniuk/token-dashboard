# Token Dashboard

Token Dashboard is a full-stack web application for viewing and interacting with an ERC-20 token directly from the browser. Users connect their wallet (MetaMask via the injected provider, or any WalletConnect wallet through Reown AppKit) to see their address, native ETH balance, and token balance, then transfer the token to any address. Transfer history is served by a NestJS API and rendered back as an on-screen history table. The frontend is a React 19 + Vite single-page app organized with **Feature-Sliced Design (FSD)**; the backend is a NestJS 11 service loosely organized with **Domain-Driven Design (DDD)**; the token is an already-deployed ERC-20 on Sepolia and its data is persisted in PostgreSQL using **vanilla `pg` + raw SQL** (no ORM).

This is a **bun workspaces monorepo**: `app/` (frontend) and `api/` (backend) are independent packages, with a thin root `package.json` providing convenience scripts.

---

## Features

These are the acceptance criteria the application satisfies, plus bonus capabilities.

**Core**

- **Connect wallet** — connect a wallet via Reown AppKit + wagmi (MetaMask injected provider, or WalletConnect).
- **Show address** — display the connected account address.
- **ETH balance** — read and display the account's native ETH balance.
- **Token balance** — read and display the ERC-20 token balance, using `name()` / `symbol()` / `decimals()` for formatting.
- **Transfer token** — submit an ERC-20 `transfer(to, amount)` transaction through the wallet and wait for the receipt.
- **Display history** — fetch and render the transfer history table for the connected address (`GET /transfers`), newest first.

**Bonus**

- **Form validation** — client-side validation (valid EVM `to` address, `amount > 0`) mirrored by server-side `class-validator` DTOs (`@IsEthereumAddress`, `@IsIn`).
- **Transaction status** — live `pending` / `success` / `failed` states surfaced in the UI while the tx is mined.
- **Wallet-signature auth (SIWE)** — sign-in-with-wallet flow: the backend issues a nonce, the wallet signs it, and the backend verifies the signature (viem `verifyMessage`) and sets an httpOnly JWT cookie. The session is restored on reload via `GET /auth/me` without re-prompting the wallet.
- **Contract event listener** — a backend watcher (viem `publicClient`) subscribed to the on-chain `Transfer` event. **Currently log-only**: it logs events to the console and does **not** persist them to the database yet (see [Known gaps](#known-gaps--roadmap)).

---

## Tech Stack

| Layer       | Technology                                                              | Architecture style                          |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------------- |
| Frontend    | React 19 (+ React Compiler) + Vite + TypeScript + Tailwind v4           | Feature-Sliced Design (FSD)                 |
| Wallet/Web3 | wagmi + Reown AppKit + viem + TanStack Query                            | Client-side wallet & RPC reads              |
| Backend     | NestJS 11 + TypeScript                                                  | Domain-Driven Design (DDD, loose)           |
| Blockchain  | viem (`publicClient` / `walletClient`)                                  | Browser wallet tx; backend event watcher    |
| Database    | PostgreSQL 18 + vanilla `pg` (raw SQL, **no ORM**)                      | `DatabaseService.query()` in `shared/db`    |

- **Frontend wallet:** the injected provider (MetaMask) / WalletConnect wrapped by wagmi + Reown AppKit; viem under the hood.
- **Backend reads/events:** viem `publicClient` (Sepolia) for the `Transfer` event watcher.
- **Database boundary:** all SQL lives behind `DatabaseService` (a `pg` `Pool` wrapper) in `api/src/shared/db`. There is **no Prisma, no TypeORM, no ORM** anywhere in the codebase.

---

## Architecture

```mermaid
flowchart LR
    Browser["React SPA (FSD)"]
    NestJS["NestJS API (DDD)"]
    Postgres[("PostgreSQL 18")]
    Chain1[("Sepolia RPC")]
    Chain2[("Sepolia RPC")]

    Browser -- "HTTP/JSON (+ cookie)" --> NestJS
    NestJS -- "pg / raw SQL" --> Postgres
    NestJS -- "Transfer event watch (log-only)" --> Chain1
    Browser -- "wallet tx & balance reads (viem)" --> Chain2
```

> ### Architecture Decision — React → NestJS direct (no Next.js gateway)
>
> The reference task assumes a Next.js API gateway sitting between the frontend and NestJS
> (Frontend → Next.js API routes → NestJS). We chose React (Vite), which has **no** server-side
> API routes. Therefore the React app calls the NestJS backend **directly**, with two transport
> modes: in **dev** the Vite dev server proxies `/auth` and `/transfers` to the API so the browser
> stays same-origin on `:5173` (the `SameSite=Lax` session cookie flows, and there is no CORS);
> in **prod** the app uses an absolute `VITE_API_URL` and the backend's CORS config is the fallback.
> The FSD `shared/api` layer is the **single network boundary** — a future BFF/proxy could be
> inserted there without touching any feature/widget code. Wallet connection, balance reads, and the
> ERC-20 transfer tx all happen client-side via the wallet + viem; the backend only serves transfer
> history and the wallet-signature auth (plus the log-only event watcher).

In practice there are **two independent paths out of the browser**:

1. **Browser → Chain (viem):** wallet connection, ETH/token balance reads, and the `transfer()` transaction. The backend is not involved.
2. **Browser → NestJS (HTTP/JSON):** wallet-signature auth and reading transfer history. All of this traffic flows through the single `shared/api` HTTP client (which always sends `credentials: 'include'`).

---

## Repository Layout

```text
token-dashboard/
├── app/         # React 19 + Vite + TypeScript frontend (FSD). The web UI + wallet/viem integration.
├── api/         # NestJS 11 + TypeScript backend (DDD). REST API + pg/raw-SQL + blockchain watcher.
│   └── db/      # *.schema.sql (DDL) and *.seed.sql (mock data), applied via the db:* scripts.
└── docs/        # Documentation (this folder). Architecture, API, schema, and DB-setup references.
```

The two workspaces are independent packages, both managed with **bun**. Run `bun run setup` once
to install all three (root, `app`, `api`). The root `package.json` only adds convenience scripts —
it does not hoist or manage the apps' dependencies.

---

## Data Flow

### Transfer lifecycle (numbered)

1. **Connect & read** — User connects the wallet → frontend reads `address`, ETH balance, and token `name` / `symbol` / `decimals` / `balanceOf` via viem (client-side, direct RPC).
2. **Authenticate (SIWE)** — On first use, the frontend runs the sign-in-with-wallet flow (`GET /auth/nonce` → wallet `signMessage` → `POST /auth/sign-in`), receiving an httpOnly `access_token` cookie. On reload the session is restored silently via `GET /auth/me`.
3. **Submit transfer** — User submits the transfer form → frontend sends the ERC-20 `transfer(to, amount)` tx via the wallet and waits for the receipt.
4. **Render history** — Frontend `GET`s the transfer history from NestJS (`GET /transfers?address=…`) and renders the table (newest first).

> **Note:** the frontend does **not** POST completed transfers to the backend — there is no
> `POST /transfers` endpoint. Persisting on-chain transfers is intended to be the job of the
> backend `Transfer`-event watcher, which is currently log-only (see [Known gaps](#known-gaps--roadmap)).
> In the meantime the `transfers` table can be populated with `bun run db:seed` (mock data).

### Sequence diagram

```mermaid
sequenceDiagram
    actor User
    participant Wallet as Wallet (MetaMask / WC)
    participant React as React app
    participant Nest as NestJS
    participant DB as Postgres
    participant Chain as Sepolia

    User->>React: Open dashboard
    React->>Wallet: Request connection
    Wallet-->>React: address

    React->>Chain: read ETH balance + name/symbol/decimals/balanceOf
    Chain-->>React: balances & token metadata
    React-->>User: render wallet & token panels

    React->>Nest: GET /auth/nonce
    Nest-->>React: nonce (plain text)
    React->>Wallet: signMessage(nonce)
    Wallet-->>React: signature
    React->>Nest: POST /auth/sign-in { address, signature }
    Nest->>Nest: verifyMessage; upsert user; sign JWT
    Nest-->>React: Set-Cookie access_token (httpOnly, SameSite=Lax)

    User->>React: Submit transfer (to, amount)
    React->>Wallet: transfer(to, amount)
    Wallet->>Chain: send signed tx
    Chain-->>Wallet: tx receipt (success)
    Wallet-->>React: receipt + txHash

    React->>Nest: GET /transfers?address=0x... (cookie)
    Nest->>DB: SELECT where address_from=$1 OR address_to=$1 (DESC)
    DB-->>Nest: Transfer[]
    Nest-->>React: 200 Transfer[]
    React-->>User: render history table (newest first)
```

---

## How to Run Locally

### Prerequisites

- **bun** (the package manager and script runner for all workspaces)
- **Podman** (the `db:*` scripts run PostgreSQL 18 in a `token-dashboard-db` container)
- **A wallet** — MetaMask browser extension, or any WalletConnect-compatible wallet
- A reachable **Sepolia RPC** endpoint and the **deployed token address**

### Steps

```bash
# 1) Install every workspace (root, app, api) in one shot
bun run setup
```

```bash
# 2) Configure environment files
cp app/.env.example app/.env   # set VITE_TOKEN_ADDRESS, VITE_CHAIN_ID, VITE_REOWN_PROJECT_ID
cp api/.env.example api/.env    # set DATABASE_URL, RPC_URL, TOKEN_ADDRESS, JWT_SECRET, WALLET_SIGN_NONCE
```

```bash
# 3) Start PostgreSQL and apply the schema (creates the users + transfers tables).
#    Optionally seed mock transfer history. Run from the repo root:
bun run db:up        # start the postgres:18 container (Podman)
bun run db:schema    # apply api/db/*.schema.sql
# bun run db:seed    # (optional, run inside api/) load api/db/*.seed.sql mock data
```

```bash
# 4) Start the backend (http://localhost:3000) and frontend (http://localhost:5173) together
bun run dev          # runs `cd api && bun run start:dev` + `cd app && bun run dev` concurrently
```

Open <http://localhost:5173>, connect your wallet (point it at Sepolia, chainId **11155111**),
and you are ready to transfer the token.

> For a detailed, first-run database walkthrough (Podman, psql, troubleshooting) see
> [PostgreSQL setup](./postgres-setup.md).

---

## Scripts

All workspaces use **bun**. The root scripts are convenience wrappers; the `db:*` ones delegate
into `api/` (`cd api && bun run …`).

### Root — run from the repo root

| Script              | Does                                                                  |
| ------------------- | --------------------------------------------------------------------- |
| `bun run setup`     | Install dependencies for every workspace (root, `app`, `api`)         |
| `bun run dev`       | Run backend + frontend together (via `concurrently`)                  |
| `bun run db:up`     | Start the `token-dashboard-db` PostgreSQL 18 container (Podman)       |
| `bun run db:stop`   | Stop the database container                                           |
| `bun run db:logs`   | Tail the database container logs                                       |
| `bun run db:psql`   | Open a `psql` shell inside the container                              |
| `bun run db:schema` | Apply `api/db/*.schema.sql`                                            |
| `bun run db:reset`  | Remove the container + volume and recreate a fresh database           |

> `db:seed` (load `api/db/*.seed.sql`) is defined in `api/package.json` only — run it from `api/`.

### Frontend — `app/` (e.g. `cd app && bun run dev`)

| Script    | Does                                                          |
| --------- | ------------------------------------------------------------ |
| `dev`     | Start the Vite dev server (`http://localhost:5173`)          |
| `build`   | Type-check (`tsc -b`) and build the production bundle        |
| `preview` | Serve the production build locally                           |
| `lint`    | Run ESLint                                                    |

### Backend — `api/` (e.g. `cd api && bun run start:dev`)

| Script        | Does                                              |
| ------------- | ------------------------------------------------- |
| `start:dev`   | Start NestJS in watch mode (`http://localhost:3000`) |
| `start`       | Start NestJS once (no watch)                      |
| `start:prod`  | Run the compiled server (`node dist/main`)        |
| `build`       | Compile with the Nest CLI                         |
| `test`        | Run unit tests (Jest)                             |
| `test:e2e`    | Run end-to-end tests                              |
| `test:cov`    | Run tests with coverage                           |
| `lint`        | Run ESLint with `--fix`                           |
| `format`      | Format `src`/`test` with Prettier                 |
| `db:*`        | Database lifecycle (see the root table; `db:seed` lives here) |

---

## Environment Variables

> **`VITE_` prefix rule:** Vite only exposes variables prefixed with `VITE_` to browser code.
> Anything used in the frontend **must** carry the `VITE_` prefix and is therefore **public**
> (bundled into the client JS). Server-only secrets (`DATABASE_URL`, `JWT_SECRET`,
> `WALLET_SIGN_NONCE`) **must NOT** be prefixed with `VITE_` — they must never reach the client bundle.

### Frontend (`app/.env`)

| Name                   | Example                  | Purpose                                                            |
| ---------------------- | ------------------------ | ----------------------------------------------------------------- |
| `VITE_API_URL`         | `http://localhost:3000`  | Base URL of the NestJS API. **Only used in prod**; in dev the `shared/api` client uses relative URLs that hit the Vite proxy. |
| `VITE_TOKEN_ADDRESS`   | `0x...`                  | Deployed Sepolia ERC-20 token address.                            |
| `VITE_CHAIN_ID`        | `11155111`               | Expected chain ID (Sepolia; defaults to `31337` if unset).        |
| `VITE_REOWN_PROJECT_ID`| `...`                    | Reown (WalletConnect) project ID, required by Reown AppKit / wagmi. |

### Backend (`api/.env`)

| Name                | Example                                                   | Purpose                                                       |
| ------------------- | -------------------------------------------------------- | ------------------------------------------------------------ |
| `PORT`              | `3000`                                                   | Port the NestJS server listens on (defaults to `3000`).      |
| `FRONTEND_URL`      | `http://localhost:5173`                                  | CORS origin (Vite dev default port).                         |
| `DATABASE_URL`      | `postgresql://user:pass@localhost:5432/token_dashboard`  | `pg` connection string for PostgreSQL. **Secret.**           |
| `RPC_URL`           | `https://sepolia.infura.io/v3/<key>`                     | Sepolia RPC endpoint for the `Transfer` event watcher.       |
| `TOKEN_ADDRESS`     | `0x...`                                                  | Deployed Sepolia token address the event watcher subscribes to. |
| `JWT_SECRET`        | `<random string>`                                       | Signing secret for the wallet-signature JWT. **Secret.**     |
| `WALLET_SIGN_NONCE` | `<message string>`                                       | The fixed message the wallet must sign during SIWE. **Secret.** |

CORS and request handling are configured in `api/src/main.ts` (after `cookieParser` and a global
whitelisting `ValidationPipe`):

```ts
app.use(cookieParser());
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
app.enableCors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  credentials: true,
});
await app.listen(process.env.PORT ?? 3000);
```

---

## API Endpoints

Base URL = `VITE_API_URL` (default `http://localhost:3000`; in dev the browser uses the Vite proxy).
Every endpoint except those marked `@Public()` is protected by a **global** `AuthGuard` that reads
the `access_token` cookie and verifies the JWT. See the [API Reference](./api-reference.md) for
request/response shapes, validation rules, and the full status-code matrix.

| Method | Path                        | Auth     | Purpose                                                                          |
| ------ | --------------------------- | -------- | -------------------------------------------------------------------------------- |
| `GET`  | `/auth/nonce`               | Public   | Returns the message (`WALLET_SIGN_NONCE`) the wallet must sign, as plain text.   |
| `POST` | `/auth/sign-in`             | Public   | Body `{ address, signature }`; verifies the signature, upserts the user, sets the httpOnly `access_token` cookie. Returns no body. |
| `GET`  | `/auth/me`                  | Required | Returns `{ address }` from the JWT (used by the frontend to restore a session).  |
| `GET`  | `/transfers?address=0x...`  | Required | List transfers where `address_from == address` OR `address_to == address`, newest first. Optional `type=sent\|received` narrows to one side. |

The `access_token` cookie is `httpOnly`, `SameSite=Lax`, `maxAge` 1 day, and `secure` only in
production. The JWT payload is `{ sub: <userId>, address: <lower-cased address> }`. Errors follow
the standard NestJS envelope: `{ statusCode, message, error }`.

---

## Database

PostgreSQL 18 with native `uuidv7()` primary keys. Two tables, defined as raw SQL in `api/db/`:

- **`users`** (`api/db/users.schema.sql`) — `id uuid pk default uuidv7()`, `wallet_address text unique not null`, `created_at timestamptz(3)`.
- **`transfers`** (`api/db/transfers.schema.sql`) — `id uuid pk default uuidv7()`, `address_from text`, `address_to text`, `amount numeric`, `tx_hash text unique`, `created_at timestamptz(3)`, plus `address_from` / `address_to` indexes.

Addresses are stored and queried lower-cased. See [Database](./database.md) for the full schema
and access pattern, and [PostgreSQL setup](./postgres-setup.md) for first-run instructions.

---

## Documentation Map

| Document                                       | Covers                                                                  |
| ---------------------------------------------- | ----------------------------------------------------------------------- |
| [Frontend (FSD)](./frontend.md)                | Feature-Sliced Design layers, slices, and the `shared/api` boundary.    |
| [Backend (DDD)](./backend.md)                  | NestJS modules, the global `AuthGuard`, transfers/auth, and the watcher.|
| [API Reference](./api-reference.md)            | Full REST contract: endpoints, DTOs, validation, and error envelopes.   |
| [Database](./database.md)                      | The `users` / `transfers` tables, the `pg` access layer, and indexes.   |
| [PostgreSQL setup](./postgres-setup.md)        | First-run database setup (Podman, psql, troubleshooting).               |

---

## Known gaps / Roadmap

- **Persist on-chain transfers** — the backend `Transfer`-event watcher (`api/src/infrastructure/blockchain/node.listener.service.ts`) currently only **logs** events via `onLogs`; it does not write them to the `transfers` table. Wiring it to `DatabaseService` would make history populate automatically (today it is populated via `bun run db:seed`).
- **Swagger / OpenAPI** — not yet wired up (`@nestjs/swagger` is not a dependency); there is no `/api/docs` route today.
- **Docker / Podman Compose** — the database runs in a standalone Podman container via the `db:*` scripts; a Compose file orchestrating `postgres` + `api` + `app` for one-command startup is a possible improvement.
