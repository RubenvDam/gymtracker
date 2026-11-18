import Dexie, { type EntityTable } from 'dexie'

export type LogType = 'weight_reps' | 'bodyweight_reps' | 'duration'

export const LOG_TYPE_LABELS: Record<LogType, string> = {
  weight_reps: 'Weight × reps',
  bodyweight_reps: 'Bodyweight reps (+ optional weight)',
  duration: 'Duration (+ optional weight)',
}

export const MUSCLES = [
  'abdominals', 'abductors', 'adductors', 'biceps', 'calves', 'chest', 'forearms',
  'glutes', 'hamstrings', 'lats', 'lower back', 'middle back', 'neck', 'quadriceps',
  'shoulders', 'traps', 'triceps',
] as const
export type Muscle = (typeof MUSCLES)[number]

export interface Profile {
  id: number
  name: string
}

/** Exercises are a shared library (not per profile). Logged sets are per profile. */
export interface Exercise {
  id: string
  name: string
  logType: LogType
  primaryMuscles: Muscle[]
  secondaryMuscles: Muscle[]
  equipment: string
  category: string
  custom: boolean
}

export const db = new Dexie('gymtracker') as Dexie & {
  profiles: EntityTable<Profile, 'id'>
  exercises: EntityTable<Exercise, 'id'>
}

db.version(1).stores({
  profiles: '++id, name',
})

db.version(2).stores({
  profiles: '++id, name',
  exercises: 'id, name, logType, *primaryMuscles',
})

export async function ensureDefaultProfiles() {
  if ((await db.profiles.count()) === 0) {
    await db.profiles.bulkAdd([{ name: 'You' }, { name: 'Buddy' }] as Profile[])
  }
}

/** Seed the shared library once. Never overwrites rows, so user edits survive. */
export async function seedExercises() {
  if ((await db.exercises.filter((e) => !e.custom).count()) > 0) return
  const res = await fetch(`${import.meta.env.BASE_URL}exercises.json`)
  if (!res.ok) throw new Error(`Could not load exercise library (${res.status})`)
  const rows = (await res.json()) as Omit<Exercise, 'custom'>[]
  await db.exercises.bulkAdd(rows.map((r) => ({ ...r, custom: false })))
}
