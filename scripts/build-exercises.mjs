// Usage: node scripts/build-exercises.mjs <path-to-free-exercise-db exercises.json>
// Source: https://github.com/yuhonas/free-exercise-db (Unlicense / public domain)
// Writes a slimmed file to public/exercises.json (no images/instructions) with an inferred logType.
import fs from 'node:fs'

const src = process.argv[2]
if (!src) throw new Error('Pass the path to exercises.json')
const data = JSON.parse(fs.readFileSync(src, 'utf8'))

const DURATION_NAME = /\b(plank|hold|wall sit|l-sit|isometric)\b/i

function inferLogType(e) {
  if (e.category === 'stretching' || e.category === 'cardio') return 'duration'
  if (DURATION_NAME.test(e.name)) return 'duration'
  if (e.equipment === 'body only') return 'bodyweight_reps'
  return 'weight_reps'
}

const out = data.map((e) => ({
  id: e.id,
  name: e.name,
  logType: inferLogType(e),
  primaryMuscles: e.primaryMuscles,
  secondaryMuscles: e.secondaryMuscles,
  equipment: e.equipment ?? 'other',
  category: e.category,
}))

// Extras the dataset lacks (timed holds). ids are prefixed so they never collide with dataset ids.
out.push(
  { id: 'extra-dead-hang', name: 'Dead Hang', logType: 'duration', primaryMuscles: ['forearms'], secondaryMuscles: ['lats', 'shoulders'], equipment: 'body only', category: 'strength' },
  { id: 'extra-weighted-dead-hang', name: 'Weighted Dead Hang', logType: 'duration', primaryMuscles: ['forearms'], secondaryMuscles: ['lats', 'shoulders'], equipment: 'other', category: 'strength' },
  { id: 'extra-side-plank', name: 'Side Plank', logType: 'duration', primaryMuscles: ['abdominals'], secondaryMuscles: ['shoulders'], equipment: 'body only', category: 'strength' },
  { id: 'extra-wall-sit', name: 'Wall Sit', logType: 'duration', primaryMuscles: ['quadriceps'], secondaryMuscles: ['glutes', 'calves'], equipment: 'body only', category: 'strength' },
  { id: 'extra-bulgarian-split-squat', name: 'Bulgarian Split Squat', logType: 'weight_reps', primaryMuscles: ['quadriceps'], secondaryMuscles: ['glutes', 'hamstrings'], equipment: 'dumbbell', category: 'strength' },
  { id: 'extra-dumbbell-romanian-deadlift', name: 'Dumbbell Romanian Deadlift', logType: 'weight_reps', primaryMuscles: ['hamstrings'], secondaryMuscles: ['glutes', 'lower back'], equipment: 'dumbbell', category: 'strength' },
)
// When adding extras, also update LIBRARY_SENTINEL in src/db/db.ts so existing installs pick them up.

fs.writeFileSync('public/exercises.json', JSON.stringify(out))
const counts = out.reduce((a, e) => ((a[e.logType] = (a[e.logType] ?? 0) + 1), a), {})
console.log(out.length, 'exercises', counts)
