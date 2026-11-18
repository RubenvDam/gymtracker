import { db, type SetEntry, type SetType } from './db'

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
}

/**
 * Values to prefill the next set with: the same set number from the last session of this
 * exercise; otherwise the previous set in this workout; otherwise the last session's last set.
 * Only working sets count, so warm-ups never drive the suggestion.
 */
export async function suggestNext(profileId: number, workoutId: number, exerciseId: string): Promise<Suggestion> {
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
  const pick = last[mine.length] ?? mine[mine.length - 1] ?? last[last.length - 1]
  return pick ? { weightKg: pick.weightKg, reps: pick.reps, durationSec: pick.durationSec } : {}
}
