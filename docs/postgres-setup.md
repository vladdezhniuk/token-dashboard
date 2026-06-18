# PostgreSQL — first-run guide (Token Dashboard)

A step-by-step guide to bring the database up for the **first time**. Written for a
**Fedora + Podman** setup (the recommended path). The values come from `api/.env.example`:
database `token_dashboard`, user `user`, password `pass`, port `5432`. Database version is
**PostgreSQL 18** (for the native `uuidv7()` function used to generate row `id`s).

> Why run Postgres in a container instead of installing it on the host? It keeps the OS
> clean, pins the version, lets you **reset and recreate** the database with a single
> command, and reproduces 1:1 on any machine. For a learning project, this is the most
> comfortable option.

---

## TL;DR — use the project scripts

This repo already wraps every container action in npm scripts, so you normally never type a
raw `podman` command. From the **repo root** (they delegate to `api/`):

```bash
bun run db:up      # start (or create on first run) the container
bun run db:stop    # stop it
bun run db:logs    # follow logs (Ctrl+C to exit)
bun run db:psql    # open a psql shell inside the container
bun run db:schema  # apply api/db/*.schema.sql (create tables)
bun run db:reset   # destroy container + volume, then recreate (db:up)
```

> Two scripts only exist inside `api/package.json` and are **not** re-exported at the repo
> root: run them from the `api/` directory.
>
> ```bash
> cd api
> bun run db:seed   # load mock data from api/db/*.seed.sql
> ```

A clean from-scratch bootstrap is therefore:

```bash
bun run db:up       # start Postgres
bun run db:schema   # create the users + transfers tables
cd api && bun run db:seed   # (optional) insert mock transfer history
```

The sections below explain what those scripts do under the hood, in case you want to run the
raw commands yourself or are debugging.

---

## Variant A — Podman (recommended) ⭐

### 1. Start Postgres

This is exactly what `bun run db:up` runs (it first tries `podman start`, and only falls back
to `podman run` on the very first launch):

```bash
podman run -d \
  --name token-dashboard-db \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=pass \
  -e POSTGRES_DB=token_dashboard \
  -p 5432:5432 \
  -v token_dashboard_pgdata:/var/lib/postgresql \
  docker.io/library/postgres:18
```

What each line does:

| Flag | Purpose |
| --- | --- |
| `-d` | run detached (in the background) |
| `--name token-dashboard-db` | container name, so you can address it by name |
| `-e POSTGRES_USER/PASSWORD/DB` | on the **first** start, creates the user, password and database |
| `-p 5432:5432` | maps the container port to `localhost:5432` |
| `-v token_dashboard_pgdata:/var/lib/postgresql` | **named volume** — data survives container restarts and even removal. ⚠️ For PG18 mount at `/var/lib/postgresql` (and **not** at `…/data`, as you would for ≤16): the 18 image stores data in a versioned subdirectory |
| `docker.io/library/postgres:18` | the Postgres 18 image (for the native `uuidv7()`; Podman requires the fully-qualified name with the registry) |

### 2. Verify it came up

```bash
podman ps                                  # container listed, status Up
podman logs token-dashboard-db | tail -5   # look for the line:
# "database system is ready to accept connections"
```

### 3. Connect to the database (psql inside the container)

You do not have `psql` on the host — and you don't need it. Run it directly in the container
(this is what `bun run db:psql` does):

```bash
podman exec -it token-dashboard-db psql -U user -d token_dashboard
```

Basic psql commands (they start with `\`):

| Command | What it does |
| --- | --- |
| `\l` | list all databases |
| `\c token_dashboard` | connect to the database |
| `\dt` | list tables (empty until you run `bun run db:schema`) |
| `\d transfers` | structure of the `transfers` table |
| `SELECT * FROM transfers;` | a normal SQL query (don't forget the `;`) |
| `\q` | quit |

### 4. Container management (day-to-day)

```bash
podman stop token-dashboard-db     # stop          (bun run db:stop)
podman start token-dashboard-db    # start again, data intact
podman logs -f token-dashboard-db  # follow logs live, Ctrl+C to exit (bun run db:logs)
```

Reset / recreate:

```bash
# remove the container BUT keep the data (the volume stays):
podman rm -f token-dashboard-db

# full reset — remove the data too (start from a clean slate):
podman rm -f token-dashboard-db && podman volume rm token_dashboard_pgdata
# then run the step-1 command again — or just `bun run db:reset`, which does
# exactly this (rm container, rm volume, db:up) in one shot.
```

> **Auto-start after reboot** (optional): a rootless container does not start itself after a
> reboot. The simplest fix is to run `bun run db:up` (or `podman start token-dashboard-db`)
> after you log in. To automate it, look into Quadlet
> (`~/.config/containers/systemd/`) — that's a more advanced setup.

### 5. Point the backend at the database

Copy the example and confirm the connection string:

```bash
cd api
cp .env.example .env
```

`api/.env` should contain:

```dotenv
DATABASE_URL=postgresql://user:pass@localhost:5432/token_dashboard
```

How to read that string:

```
postgresql://  user  :  pass  @  localhost : 5432 / token_dashboard
  protocol      user    password   host       port    database_name
```

If you changed `POSTGRES_USER/PASSWORD/DB` in step 1, change them here too so they match. The
backend reads `DATABASE_URL` at startup — `api/src/main.ts` loads it via `import 'dotenv/config'`
before Nest resolves any modules, and `DatabaseService` (`api/src/shared/db/database.service.ts`)
opens a `pg` connection pool from it.

---

## Working with the database in the backend

The backend uses the **vanilla [`pg`](https://node-postgres.com/) driver + raw SQL** — there
is **no ORM** (no Prisma, no TypeORM). The schema lives in plain `.sql` files and is applied
with project scripts; queries are hand-written SQL run through `DatabaseService.query(...)`.

**Schema files** (applied by `bun run db:schema`, which pipes them through `psql`):

- [`api/db/users.schema.sql`](../api/db/users.schema.sql) — `users` table (wallet login).
- [`api/db/transfers.schema.sql`](../api/db/transfers.schema.sql) — `transfers` table.

```sql
-- users
CREATE TABLE IF NOT EXISTS users (
    id             UUID           PRIMARY KEY DEFAULT uuidv7(),
    wallet_address TEXT           NOT NULL UNIQUE,
    created_at     TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);

-- transfers
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

Notes:

- `id` defaults to **`uuidv7()`**, a Postgres 18 native function — that's the reason this guide
  pins the `postgres:18` image.
- `tx_hash` is `UNIQUE`, so the same on-chain transfer can never be stored twice.
- The `TransfersService` (`api/src/modules/transfers/transfers.service.ts`) lower-cases the
  queried address and filters on `address_from`/`address_to`, ordering by `created_at DESC`.

**Apply the schema and (optionally) seed mock data:**

```bash
bun run db:schema           # create the tables (idempotent — IF NOT EXISTS)
cd api && bun run db:seed   # load api/db/transfers.seed.sql (mock history, idempotent)
```

The seed file [`api/db/transfers.seed.sql`](../api/db/transfers.seed.sql) inserts a handful of
fake transfers for the Hardhat account #0 wallet (stored lower-cased) so the UI has something
to render. It's idempotent: the unique `tx_hash` plus `ON CONFLICT DO NOTHING` makes re-runs a
no-op.

> ℹ️ The bonus blockchain event listener
> (`api/src/infrastructure/blockchain/node.listener.service.ts`) currently **only logs** the
> ERC-20 `Transfer` events it watches (`onLogs -> console.log`). It does **not** yet persist
> them into the `transfers` table — that's a known gap/TODO. For now the only rows in the
> table are whatever you seed.

Verify the tables exist, via psql:

```bash
podman exec -it token-dashboard-db psql -U user -d token_dashboard -c "\dt"
# or simply: bun run db:psql   then   \dt
```

---

## Variant B — Docker instead of Podman

The commands are the same — replace `podman` with `docker`. But first start the daemon:

```bash
sudo systemctl enable --now docker
sudo usermod -aG docker $USER   # to avoid typing sudo; log out and back in afterwards
```

Then run the same `docker run ...` command as Variant A (with `docker` instead of
`podman`). This repo has no `docker-compose.yml`, so there is no compose service to
start — use the plain `docker run` form or the `bun run db:up` script.

---

## Variant C — native Postgres via dnf (no containers)

If you really don't want containers:

```bash
sudo dnf install postgresql-server postgresql
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql
```

Create the user and database:

```bash
sudo -u postgres psql
```
```sql
CREATE USER "user" WITH PASSWORD 'pass';
CREATE DATABASE token_dashboard OWNER "user";
\q
```

> ⚠️ Beginner trap: by default Fedora sets up local `ident`/`peer` authentication, so a
> `user:pass` connection over `localhost` won't work. In `/var/lib/pgsql/data/pg_hba.conf`,
> set the method to `scram-sha-256` for the `host ... 127.0.0.1/32` lines, then
> `sudo systemctl restart postgresql`. Because of this hassle, **Variant A** is recommended
> for learning. Also note `psql` is on the host here, so `bun run db:*` scripts (which exec
> into a container) won't apply — run `psql -U user -d token_dashboard -f db/users.schema.sql`
> directly instead.

---

## Cheat sheet

| Action | Command |
| --- | --- |
| Start the database | `bun run db:up` (raw: `podman run … postgres:18`, step 1) |
| Stop / start | `bun run db:stop` / `bun run db:up` |
| Open psql | `bun run db:psql` |
| Create tables | `bun run db:schema` |
| Seed mock data | `cd api && bun run db:seed` |
| List tables | `bun run db:psql` then `\dt` |
| Full data reset | `bun run db:reset` (raw: `podman rm -f token-dashboard-db && podman volume rm token_dashboard_pgdata`) |
| Connection string | `postgresql://user:pass@localhost:5432/token_dashboard` |

## Common errors

| Symptom | Cause / fix |
| --- | --- |
| `port is already allocated` / `address already in use` | something already on 5432. Stop it, or change the port via `-p 5433:5432` **and** in `DATABASE_URL`. |
| `password authentication failed for user "user"` | the user/password in `DATABASE_URL` doesn't match the container's `POSTGRES_*`. |
| `connection refused` | the container isn't running (`podman ps`) or it's the wrong port. |
| Data gone after `rm` | there was no `-v` volume in step 1 — add one and don't delete the volume. |
| `short-name "postgres:18"` resolve error | Podman wants the fully-qualified name: `docker.io/library/postgres:18`. |
| `\dt` shows no tables | you haven't applied the schema yet — run `bun run db:schema`. |
| container 18 immediately `Exited (1)`; logs show `…store database data …` + `/var/lib/postgresql/data (unused mount/volume)` | the **PG18 image moved the data location**: mount the volume at `/var/lib/postgresql`, not at `…/data` (already fixed in step 1). |
| `function uuidv7() does not exist` | you're not on Postgres 18 — make sure the image tag is `postgres:18`. |
