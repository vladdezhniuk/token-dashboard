/** Render an ISO timestamp in the user's locale; falls back to the raw string. */
export function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString()
}
