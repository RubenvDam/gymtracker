import type { LogType, SetEntry } from '../db/db'

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Accepts "62.5" and "62,5" (decimal-comma keyboards). Returns undefined for blank/invalid. */
export function parseNum(s: string): number | undefined {
  const t = s.trim().replace(',', '.')
  if (!t) return undefined
  const n = Number(t)
  return Number.isFinite(n) ? n : undefined
}

export const fmtNum = (n: number) => String(Math.round(n * 100) / 100)

export const fmtClock = (totalSec: number) => {
  const s = Math.max(0, Math.round(totalSec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const fmtDuration = (s: number) => (s >= 60 ? fmtClock(s) : `${s}s`)

export function describeSet(logType: LogType, s: SetEntry): string {
  const extra = s.weightKg ? ` + ${fmtNum(s.weightKg)} kg` : ''
  if (logType === 'weight_reps') return `${fmtNum(s.weightKg ?? 0)} kg × ${s.reps ?? 0}`
  if (logType === 'bodyweight_reps') return `${s.reps ?? 0} reps${extra}`
  return `${fmtDuration(s.durationSec ?? 0)}${extra}`
}
