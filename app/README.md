# Token Dashboard — Frontend (`app/`)

React 19 + Vite + TypeScript single-page app. Connect a wallet (Reown AppKit / WalletConnect,
or an injected wallet like MetaMask via wagmi + viem), read an ERC-20 token's metadata and
balances, send `transfer(to, amount)`, and browse transfer history persisted by the NestJS
backend.

This is one workspace of a **bun monorepo**. See the [root README](../README.md) for the
blockchain/token setup and the [`docs/`](../docs) folder for the full architecture write-ups
([frontend](../docs/frontend.md), [backend](../docs/backend.md), [API](../docs/api-reference.md)).

## Architecture

The React app calls the NestJS backend **directly** over HTTP/JSON with CORS — there is
deliberately **no Next.js gateway** (this is Vite, not Next). The single network boundary is
[`src/shared/api`](src/shared/api).

The code follows **Feature-Sliced Design (FSD)**. Layers may only import downward
(`shared → entities → features → widgets → pages → app`). Each slice exposes a thin `index.ts`
public-API barrel; the implementation lives in segment folders (`ui/`, `model/`, `api/`, `lib/`).

```
src/
  app/        providers/  — Wagmi + TanStack Query + Toast tree, Reown AppKit init, chain guard
  pages/      dashboard   — the single page, composes the widgets
  widgets/    wallet-panel · token-panel · transfer-form · transfer-history
  features/   transfer-tokens — the sign → confirm → persist transfer flow + form state
  entities/   token (balance/metadata reads) · transfer (history query, API, types)
  shared/     ui (Material-3 components) · api (HTTP client) · blockchain (ERC-20 ABI/address)
              · config (env) · lib (address/amount/date/format helpers)
```

> Wallet connection is inline in [`widgets/wallet-panel`](src/widgets/wallet-panel) via
> `useAppKit()`. There is intentionally no `connect-wallet` feature, `wallet` entity, or
> wallet-signature auth in the frontend yet (those appear in [`docs/frontend.md`](../docs/frontend.md)
> as planned, not built).

The `@` import alias maps to `./src` (see [`vite.config.ts`](vite.config.ts) and
[`tsconfig.app.json`](tsconfig.app.json)).

## Tech stack

- **React 19** with the React Compiler (`babel-plugin-react-compiler`)
- **Vite 8** + **TypeScript 6**
- **wagmi 3** + **viem 2** — wallet/chain state and contract calls
- **@reown/appkit** + `appkit-adapter-wagmi` — wallet connection modal
- **TanStack Query 5** — server + on-chain read caching
- **Tailwind CSS v4** (`@tailwindcss/vite`) — CSS-first design tokens in
  [`src/index.css`](src/index.css) implement a Material-3 (Material You) theme: colours, radii,
  and a type scale live in `@theme`; stateful component classes (`.md-button`, `.md-card`, …)
  are built with `@apply`. Roboto + Material Symbols are loaded from Google Fonts in
  [`index.html`](index.html). Light/dark follows the OS preference.

## Prerequisites

- [bun](https://bun.sh)
- A wallet (e.g. MetaMask) and the address of the deployed ERC-20 token (Sepolia — see the
  [root README](../README.md))
- The NestJS backend (`api/`) running on `:3000` for transfer history — without it, the history
  panel shows an "is the backend running on :3000?" state

## Setup & run

From the repo root (installs every workspace, then runs api + web together):

```bash
bun run setup
bun run dev
```

Or this workspace only:

```bash
cd app
bun install
cp .env.example .env   # then fill in the values below
bun run dev            # http://localhost:5173
```

## Environment variables

All browser-exposed `VITE_` vars are **public** (bundled into the client JS) — never put secrets
here. They are read in one place: [`src/shared/config/env.ts`](src/shared/config/env.ts).

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `VITE_API_URL` | no | `http://localhost:3000` | NestJS backend base URL |
| `VITE_TOKEN_ADDRESS` | yes | — | Deployed ERC-20 address; Token panel + transfers stay disabled until set |
| `VITE_CHAIN_ID` | no | `31337` | Wallet target chain. Code fallback is `31337`; `.env.example` ships `11155111` (Sepolia, recommended) |
| `VITE_REOWN_PROJECT_ID` | recommended | `''` | Reown/WalletConnect project id; without it only injected wallets work |

## Scripts

| Command | Action |
| --- | --- |
| `bun run dev` | Start the Vite dev server (HMR) |
| `bun run build` | Type-check (`tsc -b`) then build for production |
| `bun run preview` | Preview the production build |
| `bun run lint` | Run ESLint |

## Backend dependency

The frontend uses two endpoints via [`src/shared/api`](src/shared/api) +
[`entities/transfer`](src/entities/transfer):

- `GET /transfers?address=` — transfer history for an address
- `POST /transfers` — persist a transfer after it is confirmed on-chain

A failed history save is **non-fatal**: the transfer already succeeded on-chain, so the UI
reports "Transfer sent (history save failed)" rather than treating it as an error. See
[`docs/api-reference.md`](../docs/api-reference.md) for the full API.
