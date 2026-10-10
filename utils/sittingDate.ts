// The masthead's date line, e.g. "Sitting of 9 October 2026". Fixed to en-GB so the
// day-month order reads the same everywhere.
export function formatSittingDate(date: Date): string {
  const day = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return `Sitting of ${day}`;
}
