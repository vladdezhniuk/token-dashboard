-- Token Dashboard — таблиця users (wallet-логін).

CREATE TABLE IF NOT EXISTS users (
    id             UUID           PRIMARY KEY DEFAULT uuidv7(),
    wallet_address TEXT           NOT NULL UNIQUE,
    created_at     TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);


create index if not EXISTS users_ids on users (id)
