import Dexie from 'dexie'
import { db, type Exercise, type SetEntry } from '../db/db'
import { describeSet, fmtClock, fmtNum } from './format'
import { addDays, startOfWeek } from './dates'

/**
 * Consecutive weeks (Mon–Sun) with at least `min` sessions. The current week counts once it
 * reaches `min`; until then it doesn't break the streak, so the count runs from last week.
 */
export function weeksOnTrack(sessionStarts: number[], min: number, now: Date): number {
  const counts = new Map<number, number>()
  for (const t of sessionStarts) {
    const k = startOfWeek(new Date(t)).getTime()
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  const thisWeek = startOfWeek(now)
  let streak = (counts.get(thisWeek.getTime()) ?? 0) >= min ? 1 : 0
  for (let wk = addDays(thisWeek, -7); (counts.get(wk.getTime()) ?? 0) >= min; wk = addDays(wk, -7)) streak++
  return streak
}

/** Epley estimated one-rep max. A single is its own 1RM. */
export const e1rm = (kg: number, reps: number) => (reps <= 1 ? kg : kg * (1 + reps / 30))

const roundHalf = (n: number) => Math.round(n * 2) / 2

export interface Best {
  exercise: Exercise
  /** Headline number, e.g. "92.5" */
  value: string
  unit: string
  /** e.g. "Best set 80 kg × 5" */
  detail: string
  /** e.g. "+10 kg since your first session"; undefined when no improvement yet */
  gain?: string
  sessions: number
  lastAt: number
}

/** Personal bests per exercise for a profile, most recently trained first. Working sets only. */
export async function personalBests(profileId: number): Promise<Best[]> {
  const sets = (
    await db.sets.where('[profileId+exerciseId]').between([profileId, Dexie.minKey], [profileId, Dexie.maxKey]).toArray()
  ).filter((s) => s.type === 'working')

  const byExercise = new Map<string, SetEntry[]>()
  for (const s of sets) byExercise.set(s.exerciseId, [...(byExercise.get(s.exerciseId) ?? []), s])

  const exercises = await db.exercises.bulkGet([...byExercise.keys()])
  const out: Best[] = []

  for (const ex of exercises) {
    if (!ex) continue
    const list = byExercise.get(ex.id)!
    const score = (s: SetEntry) =>
      ex.logType === 'weight_reps' ? e1rm(s.weightKg ?? 0, s.reps ?? 0)
      : ex.logType === 'bodyweight_reps' ? (s.reps ?? 0)
      : (s.durationSec ?? 0)
    // On equal score (same reps / seconds), the set with more added weight is the better one.
    const better = (a: SetEntry, b: SetEntry) =>
      score(b) > score(a) || (score(b) === score(a) && (b.weightKg ?? 0) > (a.weightKg ?? 0))
    const best = list.reduce((a, b) => (better(a, b) ? b : a))
    const firstWorkout = Math.min(...list.map((s) => s.workoutId))
    const firstBest = Math.max(...list.filter((s) => s.workoutId === firstWorkout).map(score))
    const gainRaw = score(best) - firstBest
    const sessions = new Set(list.map((s) => s.workoutId)).size

    let value: string, unit: string, gain: string | undefined
    if (ex.logType === 'weight_reps') {
      value = fmtNum(roundHalf(score(best)))
      unit = 'kg e1RM'
      if (roundHalf(gainRaw) >= 0.5) gain = `+${fmtNum(roundHalf(gainRaw))} kg since your first session`
    } else if (ex.logType === 'bodyweight_reps') {
      value = String(score(best))
      unit = 'reps'
      if (gainRaw >= 1) gain = `+${gainRaw} reps since your first session`
    } else {
      const secs = score(best)
      value = secs < 60 ? String(secs) : fmtClock(secs)
      unit = secs < 60 ? 's' : 'min'
      if (gainRaw >= 1) gain = `+${gainRaw}s since your first session`
    }

    out.push({
      exercise: ex,
      value,
      unit,
      detail: `Best set ${describeSet(ex.logType, best)}`,
      gain,
      sessions,
      lastAt: Math.max(...list.map((s) => s.completedAt)),
    })
  }
  return out.sort((a, b) => b.lastAt - a.lastAt)
}
