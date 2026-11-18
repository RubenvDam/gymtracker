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
  /** Weekly plan: index 0 = Monday … 6 = Sunday; routine id or null for rest. */
  schedule?: (number | null)[]
}

/** One slot in a routine. `exerciseIds[0]` is the default; the rest are alternatives (e.g. machine/DB/cable). */
export interface RoutineItem {
  key: string
  exerciseIds: string[]
  sets: number
  /** Reps, or seconds for duration exercises. */
  repMin: number
  repMax: number
  note?: string
}

export interface Routine {
  id: number
  profileId: number
  name: string
  /** Free text, e.g. "Strength" or "Volume". */
  label: string
  items: RoutineItem[]
  createdAt: number
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

export type SetType = 'warmup' | 'working'

export interface Workout {
  id: number
  profileId: number
  name: string
  startedAt: number
  /** Unset while the workout is in progress. */
  finishedAt?: number
  /** Exercises in the order they were added. */
  exerciseIds: string[]
  /** Set when started from a routine. */
  routineId?: number
}

export interface SetEntry {
  id: number
  workoutId: number
  profileId: number
  exerciseId: string
  order: number
  type: SetType
  /** Load in kg. For bodyweight/duration exercises this is optional added weight. */
  weightKg?: number
  reps?: number
  durationSec?: number
  completedAt: number
}

export const db = new Dexie('gymtracker') as Dexie & {
  profiles: EntityTable<Profile, 'id'>
  exercises: EntityTable<Exercise, 'id'>
  workouts: EntityTable<Workout, 'id'>
  sets: EntityTable<SetEntry, 'id'>
  routines: EntityTable<Routine, 'id'>
}

db.version(1).stores({
  profiles: '++id, name',
})

db.version(2).stores({
  profiles: '++id, name',
  exercises: 'id, name, logType, *primaryMuscles',
})

db.version(3).stores({
  profiles: '++id, name',
  exercises: 'id, name, logType, *primaryMuscles',
  workouts: '++id, profileId, startedAt',
  sets: '++id, workoutId, [profileId+exerciseId]',
})

db.version(4).stores({
  profiles: '++id, name',
  exercises: 'id, name, logType, *primaryMuscles',
  workouts: '++id, profileId, startedAt',
  sets: '++id, workoutId, [profileId+exerciseId]',
  routines: '++id, profileId',
})

export async function ensureDefaultProfiles() {
  if ((await db.profiles.count()) === 0) {
    await db.profiles.bulkAdd([{ name: 'You' }, { name: 'Buddy' }] as Profile[])
  }
}

/** Newest library entry. If it's missing, the library file has entries this device doesn't have yet. */
const LIBRARY_SENTINEL = 'extra-dumbbell-romanian-deadlift'

/** Seed the shared library and add entries from newer versions. Never overwrites rows, so user edits survive. */
export async function seedExercises() {
  if (await db.exercises.get(LIBRARY_SENTINEL)) return
  const res = await fetch(`${import.meta.env.BASE_URL}exercises.json`)
  if (!res.ok) throw new Error(`Could not load exercise library (${res.status})`)
  const rows = (await res.json()) as Omit<Exercise, 'custom'>[]
  const existing = new Set(await db.exercises.toCollection().primaryKeys())
  await db.exercises.bulkAdd(rows.filter((r) => !existing.has(r.id)).map((r) => ({ ...r, custom: false })))
}
