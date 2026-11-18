import { db, type Profile, type Routine, type RoutineItem } from './db'
import type { PlanTemplate } from './templates'

// UI naming: Routine = "workout" (preset), all of a profile's routines + goals = "regime".

export const LABEL_SUGGESTIONS = ['Strength', 'Volume', 'Endurance', 'Deload']

export const newKey = () => crypto.randomUUID()

/** Defaults for a new item, based on the routine's label. */
export function itemDefaults(label: string): Pick<RoutineItem, 'sets' | 'repMin' | 'repMax'> {
  return /strength|heavy|power/i.test(label) ? { sets: 4, repMin: 4, repMax: 6 } : { sets: 3, repMin: 8, repMax: 12 }
}

/** Effective regime goals, with defaults when the profile hasn't set them. */
export function regimeGoals(p: Profile | undefined, routineCount: number) {
  const weeklyGoal = p?.weeklyGoal ?? Math.max(1, Math.min(routineCount || 3, 7))
  const streakMin = Math.min(p?.streakMin ?? Math.min(3, weeklyGoal), weeklyGoal)
  return { weeklyGoal, streakMin }
}

export async function setRegimeGoals(profileId: number, goals: { weeklyGoal: number; streakMin: number }) {
  await db.profiles.update(profileId, { weeklyGoal: goals.weeklyGoal, streakMin: Math.min(goals.streakMin, goals.weeklyGoal) })
}

export async function createRoutine(profileId: number): Promise<number> {
  return db.routines.add({ profileId, name: 'New workout', label: '', items: [], createdAt: Date.now() })
}

export async function deleteRoutine(id: number) {
  await db.routines.delete(id)
}

/** Creates the template's workouts for a profile and sets its goals. Unknown exercise ids are skipped. */
export async function applyTemplate(profileId: number, t: PlanTemplate) {
  await db.transaction('rw', db.routines, db.profiles, db.exercises, async () => {
    const known = new Set(await db.exercises.toCollection().primaryKeys())
    for (const [i, r] of t.routines.entries()) {
      const items: RoutineItem[] = r.items
        .map((it) => ({ key: newKey(), exerciseIds: it.ids.filter((id) => known.has(id)), sets: it.sets, repMin: it.reps[0], repMax: it.reps[1], note: it.note }))
        .filter((it) => it.exerciseIds.length > 0)
      await db.routines.add({ profileId, name: r.name, label: r.label, items, createdAt: Date.now() + i })
    }
    await db.profiles.update(profileId, { weeklyGoal: t.weeklyGoal, streakMin: t.streakMin })
  })
}

/** Copies another profile's workouts and goals into this one. Existing workouts are kept. */
export async function copyPlan(fromProfileId: number, toProfileId: number) {
  await db.transaction('rw', db.routines, db.profiles, async () => {
    const source = await db.routines.where('profileId').equals(fromProfileId).sortBy('createdAt')
    const from = await db.profiles.get(fromProfileId)
    for (const [i, r] of source.entries()) {
      const copy: Omit<Routine, 'id'> = {
        profileId: toProfileId,
        name: r.name,
        label: r.label,
        items: r.items.map((it) => ({ ...it, key: newKey() })),
        createdAt: Date.now() + i,
      }
      await db.routines.add(copy)
    }
    if (from?.weeklyGoal !== undefined) {
      await db.profiles.update(toProfileId, { weeklyGoal: from.weeklyGoal, streakMin: from.streakMin })
    }
  })
}

/** The variant this profile used most recently, else the slot's default. */
async function preferredVariant(profileId: number, ids: string[]): Promise<string> {
  if (ids.length === 1) return ids[0]
  let best = ids[0]
  let bestSetId = -1
  for (const id of ids) {
    const last = await db.sets.where('[profileId+exerciseId]').equals([profileId, id]).last()
    if (last && last.id > bestSetId) {
      best = id
      bestSetId = last.id
    }
  }
  return best
}

/** Start a session from a preset workout. If a session is already in progress, that one is returned instead. */
export async function startFromRoutine(profileId: number, routineId: number): Promise<number> {
  return db.transaction('rw', db.workouts, db.routines, db.sets, async () => {
    const open = await db.workouts.where('profileId').equals(profileId).filter((w) => !w.finishedAt).first()
    if (open) return open.id
    const r = await db.routines.get(routineId)
    if (!r) throw new Error('Routine not found')
    const exerciseIds: string[] = []
    for (const item of r.items) {
      const id = await preferredVariant(profileId, item.exerciseIds)
      if (!exerciseIds.includes(id)) exerciseIds.push(id)
    }
    return db.workouts.add({ profileId, name: r.name, routineId: r.id, startedAt: Date.now(), exerciseIds })
  })
}

export function formatTarget(item: Pick<RoutineItem, 'sets' | 'repMin' | 'repMax'>, unit: 'reps' | 's' = 'reps') {
  const range = item.repMin === item.repMax ? `${item.repMin}` : `${item.repMin}–${item.repMax}`
  return `${item.sets} × ${range}${unit === 's' ? ' s' : ''}`
}
