// MongoDB index setup — the equivalent of *.schema.sql for the Mongo driver.
// Mongo creates collections lazily, so we only declare indexes (which also
// creates the collections). Mirrors the UNIQUE / lookup indexes from the SQL
// schema; `_id` is auto-indexed so there is no equivalent of users_ids.
// Idempotent: createIndex is a no-op when the index already exists.
// Run with `bun run mongo:schema`.

db.users.createIndex({ wallet_address: 1 }, { unique: true });

db.transfers.createIndex({ tx_hash: 1, log_index: 1 }, { unique: true });
db.transfers.createIndex({ address_from: 1 });
db.transfers.createIndex({ address_to: 1 });
db.transfers.createIndex({ created_at: -1 });
