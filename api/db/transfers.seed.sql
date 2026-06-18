-- Mock transfer history for local dev / UI testing.
-- Subject wallet = Hardhat account #0 (stored lower-cased to match how the API
-- looks rows up: `where address_from = lower($1)`). Counterparties are the other
-- default Hardhat accounts. `amount` is a human-readable token value (the table
-- renders it verbatim). Idempotent: re-running is a no-op thanks to the unique
-- tx_hash + ON CONFLICT. Run with `bun run db:seed`.

INSERT INTO transfers (address_from, address_to, amount, tx_hash, created_at) VALUES
  -- Outgoing (sent) — subject is the sender
  ('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',  120.5,     '0x' || md5('seed-1-from') || md5('seed-1-to'), now() - interval '2 hours'),
  ('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc',  1000,      '0x' || md5('seed-2-from') || md5('seed-2-to'), now() - interval '1 day'),
  ('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', '0x90f79bf6eb2c4f870365e785982e1f101e93b906',  42.75,     '0x' || md5('seed-3-from') || md5('seed-3-to'), now() - interval '3 days'),
  -- Incoming (received) — subject is the recipient
  ('0x70997970c51812dc3a010c7d01b50e0d17dc79c8', '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',  500,       '0x' || md5('seed-4-from') || md5('seed-4-to'), now() - interval '5 hours'),
  ('0x15d34aaf54267db7d7c367839aaf71a00a2c6a65', '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',  75.2,      '0x' || md5('seed-5-from') || md5('seed-5-to'), now() - interval '2 days'),
  ('0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc', '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',  3300.4399, '0x' || md5('seed-6-from') || md5('seed-6-to'), now() - interval '6 days')
ON CONFLICT (tx_hash) DO NOTHING;
