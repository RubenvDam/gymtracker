import { db, type LogType, type RoutineItem, type SetEntry, type SetType } from './db'

/** Start a workout, or return the one already in progress for this profile. */
export async function startWorkout(profileId: number): Promise<number> {
  return db.transaction('rw', db.workouts, async () => {
    const open = await db.workouts.where('profileId').equals(profileId).filter((w) => !w.finishedAt).first()
    if (open) return open.id
    return db.workouts.add({ profileId, name: 'Workout', startedAt: Date.now(), exerciseIds: [] })
  })
}

export async function addExercise(workoutId: number, exerciseId: string) {
  await db.transaction('rw', db.workouts, async () => {
    const w = await db.workouts.get(workoutId)
    if (!w || w.exerciseIds.includes(exerciseId)) return
    await db.workouts.update(workoutId, { exerciseIds: [...w.exerciseIds, exerciseId] })
  })
}

/** Removes the exercise and any sets logged for it in this workout. */
export async function removeExercise(workoutId: number, exerciseId: string) {
  await db.transaction('rw', db.workouts, db.sets, async () => {
    const w = await db.workouts.get(workoutId)
    if (!w) return
    await db.workouts.update(workoutId, { exerciseIds: w.exerciseIds.filter((id) => id !== exerciseId) })
    await db.sets.where('workoutId').equals(workoutId).filter((s) => s.exerciseId === exerciseId).delete()
  })
}

/** Replace an exercise in this session only (the preset is untouched). Only before any set is logged on it. */
export async function replaceExercise(workoutId: number, fromId: string, toId: string): Promise<boolean> {
  return db.transaction('rw', db.workouts, db.sets, async () => {
    const logged = await db.sets.where('workoutId').equals(workoutId).filter((s) => s.exerciseId === fromId).count()
    const w = await db.workouts.get(workoutId)
    if (logged > 0 || !w || w.exerciseIds.includes(toId)) return false
    await db.workouts.update(workoutId, { exerciseIds: w.exerciseIds.map((id) => (id === fromId ? toId : id)) })
    return true
  })
}

export interface NewSet {
  workoutId: number
  profileId: number
  exerciseId: string
  type: SetType
  weightKg?: number
  reps?: number
  durationSec?: number
}

export async function logSet(input: NewSet) {
  await db.transaction('rw', db.sets, async () => {
    const order = await db.sets
      .where('workoutId').equals(input.workoutId)
      .filter((s) => s.exerciseId === input.exerciseId)
      .count()
    await db.sets.add({ ...input, order, completedAt: Date.now() })
  })
}

export async function deleteSet(id: number) {
  await db.sets.delete(id)
}

export async function finishWorkout(id: number) {
  await db.workouts.update(id, { finishedAt: Date.now() })
}

export async function discardWorkout(id: number) {
  await db.transaction('rw', db.workouts, db.sets, async () => {
    await db.sets.where('workoutId').equals(id).delete()
    await db.workouts.delete(id)
  })
}

export interface Suggestion {
  weightKg?: number
  reps?: number
  durationSec?: number
  /** Set when last session hit the top of the rep range on every target set: the weight was increased by this much. */
  progressedKg?: number
}

export interface SuggestOptions {
  /** Routine target for this exercise, if the workout came from a routine. */
  target?: Pick<RoutineItem, 'sets' | 'repMin' | 'repMax'>
  logType?: LogType
  /** Weight step for progression (kg). */
  incKg?: number
}

/**
 * Values to prefill the next set with: the same set number from the last session of this
 * exercise; otherwise the previous set in this workout; otherwise the last session's last set.
 * Only working sets count, so warm-ups never drive the suggestion.
 *
 * Double progression: with a routine target, if last session reached the top of the rep range on
 * all target sets at the same weight, the first set suggests weight + incKg at the bottom of the range.
 */
export async function suggestNext(profileId: number, workoutId: number, exerciseId: string, opts: SuggestOptions = {}): Promise<Suggestion> {
  const all = await db.sets.where('[profileId+exerciseId]').equals([profileId, exerciseId]).toArray()
  const working = all.filter((s) => s.type === 'working')
  const byOrder = (a: SetEntry, b: SetEntry) => a.order - b.order
  const mine = working.filter((s) => s.workoutId === workoutId).sort(byOrder)
  const prior = working.filter((s) => s.workoutId !== workoutId)
  let last: SetEntry[] = []
  if (prior.length) {
    const lastId = Math.max(...prior.map((s) => s.workoutId)) // ids are auto-increment, so max = most recent
    last = prior.filter((s) => s.workoutId === lastId).sort(byOrder)
  }
  const { target, logType, incKg = 2.5 } = opts

  if (target && logType && logType !== 'duration' && last.length >= target.sets) {
    const top = last.slice(0, target.sets)
    const maxW = Math.max(...top.map((s) => s.weightKg ?? 0))
    const allHit = top.every((s) => (s.reps ?? 0) >= target.repMax && (s.weightKg ?? 0) >= maxW)
    if (allHit) {
      // After the first set, follow what was actually lifted this session.
      const prev = mine[mine.length - 1]
      return prev
        ? { weightKg: prev.weightKg, reps: prev.reps, progressedKg: incKg }
        : { weightKg: maxW + incKg, reps: target.repMin, progressedKg: incKg }
    }
  }

  const pick = last[mine.length] ?? mine[mine.length - 1] ?? last[last.length - 1]
  if (pick) return { weightKg: pick.weightKg, reps: pick.reps, durationSec: pick.durationSec }
  if (target) return logType === 'duration' ? { durationSec: target.repMin } : { reps: target.repMin }
  return {}
}
