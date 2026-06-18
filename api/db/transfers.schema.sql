CREATE TABLE IF NOT EXISTS transfers (
    id           UUID           PRIMARY KEY DEFAULT uuidv7(),
    address_from TEXT           NOT NULL,
    address_to   TEXT           NOT NULL,
    amount       NUMERIC        NOT NULL,
    tx_hash      TEXT           NOT NULL,
    log_index    INTEGER        NOT NULL,
    created_at   TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    -- One Transfer event = (tx_hash, log_index); a single tx can emit several.
    UNIQUE (tx_hash, log_index)
);


CREATE INDEX IF NOT EXISTS transfers_from_idx ON transfers (address_from);
CREATE INDEX IF NOT EXISTS transfers_to_idx   ON transfers (address_to);
