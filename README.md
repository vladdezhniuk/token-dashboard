# Token Dashboard

View and interact with an already-deployed ERC-20 token on the Sepolia testnet from a web UI:
connect a wallet, see ETH and token balances, transfer the token, and browse transfer history.

Monorepo layout:

| Workspace | Stack | Purpose |
| --- | --- | --- |
| [`app/`](app) | React 19 + Vite + TypeScript (Feature-Sliced Design) | Frontend SPA |
| [`api/`](api) | NestJS 11 + TypeScript (Domain-Driven Design) | Backend API |

> The React app calls the NestJS backend **directly** over HTTP (with CORS) — there is no
> Next.js gateway, because the frontend is Vite. See [`docs/`](docs) for the full frontend
> (FSD), backend (DDD), API, and database architecture documentation.

The two workspaces are **independent packages**, both managed with **bun**. Run
`bun run setup` once to install both workspaces. The root `package.json` only adds convenience
scripts — it does not hoist or manage the apps' dependencies.

---

## Blockchain / Token

The app talks to an **already-deployed ERC-20 token on the Sepolia testnet** (chainId
`11155111`). There is no contract to compile or deploy from this repo — both apps just read the
deployed token by address through a standard ERC-20 ABI (`balanceOf`, `transfer`, `decimals`,
`symbol`, `name`, and the `Transfer` event).

### Local development workflow

First-time install — one command installs both workspaces (root, app, api) with bun:

```bash
bun run setup
```

**Point the apps at the token (Sepolia):**

- **Frontend** (`app/`): set `VITE_TOKEN_ADDRESS` to the deployed token address and
  `VITE_CHAIN_ID=11155111` in `app/.env` (copy from `app/.env.example`).
- **Backend** (`api/`): set `TOKEN_ADDRESS` to the same address and `RPC_URL` to a Sepolia RPC
  endpoint in `api/.env` (copy from `api/.env.example`). The future Transfer-event listener reads
  the same token. *(The listener itself is not implemented yet.)*

Run the backend and frontend together with one command:

```bash
bun run dev        # api + web concurrently
```

### Funding a test wallet

To pay gas and have a balance to transfer, fund your wallet with Sepolia test ETH from a faucet,
e.g.:

- https://sepoliafaucet.com
- https://www.alchemy.com/faucets/ethereum-sepolia
- https://cloud.google.com/application/web3/faucet/ethereum/sepolia

### Environment variables (all workspaces)

| Variable | Workspace | Example | Secret? |
| --- | --- | --- | --- |
| `VITE_API_URL` | `app` (frontend) | `http://localhost:3000` | No — public, bundled into client JS |
| `VITE_TOKEN_ADDRESS` | `app` | `0x<deployed-sepolia-token-address>` | No |
| `VITE_CHAIN_ID` | `app` | `11155111` | No |
| `PORT` | `api` (backend) | `3000` | No |
| `FRONTEND_URL` | `api` | `http://localhost:5173` | No |
| `DATABASE_URL` | `api` | `postgresql://user:pass@localhost:5432/token_dashboard` | **Yes** |
| `RPC_URL` | `api` | `https://sepolia.infura.io/v3/<key>` | No (provider key, if any, is) |
| `TOKEN_ADDRESS` | `api` | `0x<deployed-sepolia-token-address>` | No |
| `JWT_SECRET` | `api` | `<random string>` | **Yes** |

**Public vs server-only:** `DATABASE_URL` and `JWT_SECRET` are server/dev-only secrets and
**must never** be exposed to the browser — do **not** give them a `VITE_` (or `NEXT_PUBLIC_`)
prefix. The only network var the frontend needs, `VITE_API_URL`, is intentionally public: the
browser must know where to reach the API.

## Scripts

All workspaces use **bun**. The root scripts are convenience wrappers that delegate into the
workspaces (`cd <dir> && bun run …`), so you rarely need to `cd` anywhere yourself.

### Root — run from the repo root with `bun`

| Script | Does |
| --- | --- |
| `bun run setup` | Install dependencies for every workspace (root, app, api) |
| `bun run dev` | Run backend + frontend together (via `concurrently`) |

### Frontend — `app/` (run with `bun`, e.g. `cd app && bun run dev`)

| Script | Does |
| --- | --- |
| `dev` | Start the Vite dev server (`http://localhost:5173`) |
| `build` | Type-check (`tsc -b`) and build the production bundle |
| `preview` | Serve the production build locally |
| `lint` | Run ESLint |

### Backend — `api/` (run with `bun`, e.g. `cd api && bun run start:dev`)

| Script | Does |
| --- | --- |
| `start:dev` | Start NestJS in watch mode (`http://localhost:3000`) |
| `start` | Start NestJS once (no watch) |
| `start:prod` | Run the compiled server (`node dist/main`) |
| `build` | Compile with the Nest CLI |
| `test` | Run unit tests (Jest) |
| `test:e2e` | Run end-to-end tests |
| `test:cov` | Run tests with coverage |
| `lint` | Run ESLint with `--fix` |
| `format` | Format `src`/`test` with Prettier |
