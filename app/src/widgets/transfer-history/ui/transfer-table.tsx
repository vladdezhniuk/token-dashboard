import { formatDate, shortenAddress } from '@/shared/lib'
import type { TransferRecord } from '@/entities/transfer'

/** Presentational table of transfer records (newest first, as provided). */
export function TransferTable({ rows }: { rows: TransferRecord[] }) {
  return (
    <div className="md-table-scroll">
      <table className="md-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>From</th>
            <th>To</th>
            <th>Amount</th>
            <th>Tx</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.txHash}>
              <td className="text-on-surface-variant">{formatDate(t.createdAt)}</td>
              <td className="font-mono">{shortenAddress(t.from)}</td>
              <td className="font-mono">{shortenAddress(t.to)}</td>
              <td>{t.amount}</td>
              <td className="font-mono">{shortenAddress(t.txHash, 6)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
