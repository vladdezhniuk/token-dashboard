// Mock transfer history for dev / UI testing — the Mongo equivalent of
// transfers.seed.sql. Subject wallet = 0xd6bD002FF2f8ba540cf2c39bD356296733E97b78,
// stored lower-cased to match how the API looks rows up. `amount` is the raw
// on-chain value in base units (18 decimals) stored as a STRING: the values
// overflow JS doubles, and pg returns NUMERIC as a string too, so this keeps
// the `Transfer.amount` shape identical across drivers. Idempotent: an upsert
// keyed on (tx_hash, log_index) mirrors ON CONFLICT (tx_hash, log_index) DO
// NOTHING. Run with `bun run mongo:seed`.

(function seed() {
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  const now = Date.now();

  const transfers = [
    // Outgoing (sent) — subject is the sender   (amounts: 120.5 / 1000 / 42.75 LINK)
    { address_from: '0xd6bd002ff2f8ba540cf2c39bd356296733e97b78', address_to: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8', amount: '120500000000000000000',  tx_hash: '0x0588e368783b969945b642f8920748ac6c8f194d6f4c47d9a3ffc38515711a7f', log_index: 0, created_at: new Date(now - 2 * hour) },
    { address_from: '0xd6bd002ff2f8ba540cf2c39bd356296733e97b78', address_to: '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc', amount: '1000000000000000000000', tx_hash: '0x594e6799cb0b6f23bf1288ad63700de7a64993e81a4f27e2c2f7a7b0a5f9d523', log_index: 0, created_at: new Date(now - 1 * day) },
    { address_from: '0xd6bd002ff2f8ba540cf2c39bd356296733e97b78', address_to: '0x90f79bf6eb2c4f870365e785982e1f101e93b906', amount: '42750000000000000000',   tx_hash: '0x25205369c02d2ad60ee81e178a039156fd6f78874da452505e24df065ea12e4d', log_index: 0, created_at: new Date(now - 3 * day) },
    // Incoming (received) — subject is the recipient   (amounts: 500 / 75.2 / 3300.4399 LINK)
    { address_from: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8', address_to: '0xd6bd002ff2f8ba540cf2c39bd356296733e97b78', amount: '500000000000000000000',  tx_hash: '0xf375da726ddfef84b8bc837384e0c8506b2c7f39040ba4e3a43ab7fb71abf9d4', log_index: 0, created_at: new Date(now - 5 * hour) },
    { address_from: '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65', address_to: '0xd6bd002ff2f8ba540cf2c39bd356296733e97b78', amount: '75200000000000000000',   tx_hash: '0x44643674a458dcebf44deb03c546018e28816a79574ff708e9742e5e1b1285a1', log_index: 0, created_at: new Date(now - 2 * day) },
    { address_from: '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc', address_to: '0xd6bd002ff2f8ba540cf2c39bd356296733e97b78', amount: '3300439900000000000000', tx_hash: '0x1d412052563774d5ac4eae2c3c8c2000db19e90eef3fe87ba18cd8f3c7f831c9', log_index: 0, created_at: new Date(now - 6 * day) },
  ];

  for (const t of transfers) {
    db.transfers.updateOne(
      { tx_hash: t.tx_hash, log_index: t.log_index },
      { $setOnInsert: t },
      { upsert: true },
    );
  }

  print(`transfers seeded: ${db.transfers.countDocuments()}`);
})();
