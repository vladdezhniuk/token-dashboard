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
