export const DAY_MS = 86_400_000

/** Monday 00:00 of the week containing `d`. */
export function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const offset = (x.getDay() + 6) % 7 // Mon = 0
  x.setDate(x.getDate() - offset)
  return x
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()

/** "today", "yesterday", "Mon", or "12 Nov" for older dates. */
export function relativeDay(ts: number, now = new Date()): string {
  const d = new Date(ts)
  if (sameDay(d, now)) return 'today'
  if (sameDay(d, addDays(now, -1))) return 'yesterday'
  if (now.getTime() - ts < 6 * DAY_MS) return d.toLocaleDateString('en-GB', { weekday: 'short' })
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
