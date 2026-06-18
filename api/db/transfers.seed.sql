-- Mock transfer history for dev / UI testing.
-- Subject wallet = 0xd6bD002FF2f8ba540cf2c39bD356296733E97b78, stored lower-cased to
-- match how the API looks rows up (`where address_from = lower($1)`). Counterparties
-- are arbitrary addresses (default Hardhat accounts) — display data only. `amount` is
-- a human-readable token value (the table renders it verbatim). `log_index` is 0 for
-- every row (one transfer per tx). Idempotent: re-running is a no-op thanks to the
-- unique (tx_hash, log_index) + ON CONFLICT. Run with `bun run db:seed`.

INSERT INTO transfers (address_from, address_to, amount, tx_hash, log_index, created_at) VALUES
  -- Outgoing (sent) — subject is the sender
  ('0xd6bd002ff2f8ba540cf2c39bd356296733e97b78', '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',  120.5,     '0x0588e368783b969945b642f8920748ac6c8f194d6f4c47d9a3ffc38515711a7f', 0, now() - interval '2 hours'),
  ('0xd6bd002ff2f8ba540cf2c39bd356296733e97b78', '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc',  1000,      '0x594e6799cb0b6f23bf1288ad63700de7a64993e81a4f27e2c2f7a7b0a5f9d523', 0, now() - interval '1 day'),
  ('0xd6bd002ff2f8ba540cf2c39bd356296733e97b78', '0x90f79bf6eb2c4f870365e785982e1f101e93b906',  42.75,     '0x25205369c02d2ad60ee81e178a039156fd6f78874da452505e24df065ea12e4d', 0, now() - interval '3 days'),
  -- Incoming (received) — subject is the recipient
  ('0x70997970c51812dc3a010c7d01b50e0d17dc79c8', '0xd6bd002ff2f8ba540cf2c39bd356296733e97b78',  500,       '0xf375da726ddfef84b8bc837384e0c8506b2c7f39040ba4e3a43ab7fb71abf9d4', 0, now() - interval '5 hours'),
  ('0x15d34aaf54267db7d7c367839aaf71a00a2c6a65', '0xd6bd002ff2f8ba540cf2c39bd356296733e97b78',  75.2,      '0x44643674a458dcebf44deb03c546018e28816a79574ff708e9742e5e1b1285a1', 0, now() - interval '2 days'),
  ('0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc', '0xd6bd002ff2f8ba540cf2c39bd356296733e97b78',  3300.4399, '0x1d412052563774d5ac4eae2c3c8c2000db19e90eef3fe87ba18cd8f3c7f831c9', 0, now() - interval '6 days')
ON CONFLICT (tx_hash, log_index) DO NOTHING;
