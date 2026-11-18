import { db, type Routine, type RoutineItem } from './db'
import type { PlanTemplate } from './templates'

export const LABEL_SUGGESTIONS = ['Strength', 'Volume', 'Endurance', 'Deload']
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export const newKey = () => crypto.randomUUID()
const emptyWeek = (): (number | null)[] => Array(7).fill(null)

/** Monday = 0 … Sunday = 6 */
export const weekdayIndex = (d: Date) => (d.getDay() + 6) % 7

/** Defaults for a new item, based on the routine's label. */
export function itemDefaults(label: string): Pick<RoutineItem, 'sets' | 'repMin' | 'repMax'> {
  return /strength|heavy|power/i.test(label) ? { sets: 4, repMin: 4, repMax: 6 } : { sets: 3, repMin: 8, repMax: 12 }
}

export async function createRoutine(profileId: number): Promise<number> {
  return db.routines.add({ profileId, name: 'New routine', label: '', items: [], createdAt: Date.now() })
}

export async function deleteRoutine(id: number) {
  await db.transaction('rw', db.routines, db.profiles, async () => {
    const r = await db.routines.get(id)
    if (!r) return
    const p = await db.profiles.get(r.profileId)
    if (p?.schedule) await db.profiles.update(p.id, { schedule: p.schedule.map((x) => (x === id ? null : x)) })
    await db.routines.delete(id)
  })
}

export async function setScheduleDay(profileId: number, weekday: number, routineId: number | null) {
  await db.transaction('rw', db.profiles, async () => {
    const p = await db.profiles.get(profileId)
    if (!p) return
    const schedule = [...(p.schedule ?? emptyWeek())]
    schedule[weekday] = routineId
    await db.profiles.update(profileId, { schedule })
  })
}

/** Creates the template's routines for a profile and sets its weekly plan. Unknown exercise ids are skipped. */
export async function applyTemplate(profileId: number, t: PlanTemplate) {
  await db.transaction('rw', db.routines, db.profiles, db.exercises, async () => {
    const known = new Set(await db.exercises.toCollection().primaryKeys())
    const idByKey: Record<string, number> = {}
    for (const [i, r] of t.routines.entries()) {
      const items: RoutineItem[] = r.items
        .map((it) => ({ key: newKey(), exerciseIds: it.ids.filter((id) => known.has(id)), sets: it.sets, repMin: it.reps[0], repMax: it.reps[1], note: it.note }))
        .filter((it) => it.exerciseIds.length > 0)
      idByKey[r.key] = await db.routines.add({ profileId, name: r.name, label: r.label, items, createdAt: Date.now() + i })
    }
    await db.profiles.update(profileId, { schedule: t.schedule.map((k) => (k ? idByKey[k] : null)) })
  })
}

/** Copies another profile's routines into this one and adopts its weekly plan. Existing routines are kept. */
export async function copyPlan(fromProfileId: number, toProfileId: number) {
  await db.transaction('rw', db.routines, db.profiles, async () => {
    const source = await db.routines.where('profileId').equals(fromProfileId).sortBy('createdAt')
    const from = await db.profiles.get(fromProfileId)
    const newId = new Map<number, number>()
    for (const [i, r] of source.entries()) {
      const copy: Omit<Routine, 'id'> = {
        profileId: toProfileId,
        name: r.name,
        label: r.label,
        items: r.items.map((it) => ({ ...it, key: newKey() })),
        createdAt: Date.now() + i,
      }
      newId.set(r.id, await db.routines.add(copy))
    }
    const schedule = (from?.schedule ?? emptyWeek()).map((x) => (x === null ? null : (newId.get(x) ?? null)))
    await db.profiles.update(toProfileId, { schedule })
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

/** Start a workout from a routine. If a workout is already in progress, that one is returned instead. */
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

/** Switch a slot to another variant. Only allowed before any set is logged on the current one. */
export async function swapVariant(workoutId: number, fromId: string, toId: string): Promise<boolean> {
  return db.transaction('rw', db.workouts, db.sets, async () => {
    const logged = await db.sets.where('workoutId').equals(workoutId).filter((s) => s.exerciseId === fromId).count()
    const w = await db.workouts.get(workoutId)
    if (logged > 0 || !w || w.exerciseIds.includes(toId)) return false
    await db.workouts.update(workoutId, { exerciseIds: w.exerciseIds.map((id) => (id === fromId ? toId : id)) })
    return true
  })
}

export function formatTarget(item: Pick<RoutineItem, 'sets' | 'repMin' | 'repMax'>, unit: 'reps' | 's' = 'reps') {
  const range = item.repMin === item.repMax ? `${item.repMin}` : `${item.repMin}–${item.repMax}`
  return `${item.sets} × ${range}${unit === 's' ? ' s' : ''}`
}
