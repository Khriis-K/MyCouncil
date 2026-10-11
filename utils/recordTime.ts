const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n: number) => String(n).padStart(2, '0');

// When an amendment entered the record, e.g. "9 Oct · 10:42", on the local clock.
// Built by hand rather than with toLocaleString, whose short months vary by ICU build ("Sep" vs "Sept").
export function formatRecordTime(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
