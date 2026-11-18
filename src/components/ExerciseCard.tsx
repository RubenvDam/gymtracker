import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Exercise, type Muscle, type RoutineItem, type SetEntry, type Workout } from '../db/db'
import { deleteSet, logSet, removeExercise, suggestNext } from '../db/workouts'
import { formatTarget } from '../db/routines'
import { cap, describeSet, fmtNum, parseNum } from '../lib/format'
import Stepper from './Stepper'
import Icon from './Icon'

interface Props {
  workout: Workout
  exercise: Exercise
  onLogged: () => void
  /** Routine slot this exercise fills, if the workout came from a routine. */
  target?: RoutineItem
  /** All variants for this slot (including the current one), when the slot has alternatives. */
  variants?: Exercise[]
  onSwap?: (toId: string) => void
}

const BIG_LOWER: Muscle[] = ['quadriceps', 'hamstrings', 'glutes']

/** Progression step: bigger jumps for barbell/machine leg work, small ones for everything else. */
const progressionStep = (e: Exercise) =>
  e.primaryMuscles.some((m) => BIG_LOWER.includes(m)) && ['barbell', 'machine'].includes(e.equipment) ? 5 : 2.5

/** Short label for a variant: its equipment, or the words of its name that differ from the other variants. */
function variantLabel(v: Exercise, all: Exercise[]) {
  const unique = all.filter((x) => x.equipment === v.equipment).length === 1
  if (unique && v.equipment !== 'other') return v.equipment === 'body only' ? 'Bodyweight' : cap(v.equipment)
  const words = (e: Exercise) => e.name.toLowerCase().split(/\s+/)
  const shared = all.map(words).reduce((acc, w) => acc.filter((x) => w.includes(x)))
  const rest = v.name.split(/\s+/).filter((w) => !shared.includes(w.toLowerCase()))
  return rest.join(' ') || v.name
}

export default function ExerciseCard({ workout, exercise, onLogged, target, variants, onSwap }: Props) {
  const { logType } = exercise
  const sets = useLiveQuery(
    () => db.sets.where('workoutId').equals(workout.id).filter((s) => s.exerciseId === exercise.id).sortBy('order'),
    [workout.id, exercise.id],
    [] as SetEntry[],
  )
  const targetKey = target ? `${target.sets}/${target.repMin}/${target.repMax}` : ''
  // Re-run whenever a set is added/removed so the prefill advances to the next set number.
  const suggestion = useLiveQuery(
    () => suggestNext(workout.profileId, workout.id, exercise.id, { target, logType, incKg: progressionStep(exercise) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- target is tracked via targetKey
    [workout.profileId, workout.id, exercise.id, logType, targetKey, sets.map((s) => `${s.id}${s.type}`).join()],
    null,
  )
  const workingDone = sets.filter((s) => s.type === 'working').length

  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [secs, setSecs] = useState('')
  const [warmup, setWarmup] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

  const suggestionKey = JSON.stringify(suggestion)
  useEffect(() => {
    if (!suggestion) return
    setWeight(suggestion.weightKg ? fmtNum(suggestion.weightKg) : '')
    setReps(suggestion.reps ? String(suggestion.reps) : '')
    setSecs(suggestion.durationSec ? String(suggestion.durationSec) : '')
    setWarmup(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the serialized suggestion on purpose
  }, [suggestionKey])

  const w = parseNum(weight)
  const r = parseNum(reps)
  const s = parseNum(secs)
  const valid =
    (w === undefined || w >= 0) &&
    (logType === 'weight_reps' ? w !== undefined && r !== undefined && r >= 1 : true) &&
    (logType === 'bodyweight_reps' ? r !== undefined && r >= 1 : true) &&
    (logType === 'duration' ? s !== undefined && s >= 1 : true)

  const submit = async () => {
    if (!valid) return
    await logSet({
      workoutId: workout.id,
      profileId: workout.profileId,
      exerciseId: exercise.id,
      type: warmup ? 'warmup' : 'working',
      weightKg: logType === 'weight_reps' ? w : w && w > 0 ? w : undefined,
      reps: logType === 'duration' ? undefined : Math.round(r ?? 0),
      durationSec: logType === 'duration' ? Math.round(s ?? 0) : undefined,
    })
    setWarmup(false) // the prefill effect doesn't fire after a warm-up, so reset explicitly
    onLogged()
  }

  let n = 0
  return (
    <article className="card">
      <div className="ex-head">
        <div className="grow">
          <h3>{exercise.name}</h3>
          {target ? (
            <span className={workingDone >= target.sets ? 'target done' : 'target'}>
              {workingDone >= target.sets && <Icon name="check" size={14} />}
              Target {formatTarget(target, logType === 'duration' ? 's' : 'reps')}
              {target.note && ` · ${target.note}`}
              {workingDone > 0 && ` · ${Math.min(workingDone, target.sets)}/${target.sets} done`}
            </span>
          ) : (
            <span className="sub">{exercise.primaryMuscles.map(cap).join(', ')}</span>
          )}
        </div>
        {confirmRemove ? (
          <button className="btn-text danger" onClick={() => removeExercise(workout.id, exercise.id)}>Remove + its sets?</button>
        ) : (
          <button className="btn-text muted" onClick={() => setConfirmRemove(true)} aria-label={`Remove ${exercise.name}`}>Remove</button>
        )}
      </div>

      {sets.length > 0 && (
        <ol className="sets">
          {sets.map((st) => {
            if (st.type === 'working') n += 1
            return (
              <li key={st.id}>
                <span className={st.type === 'warmup' ? 'tag warm' : 'tag'}>{st.type === 'warmup' ? 'W' : n}</span>
                <span className="grow">{describeSet(logType, st)}</span>
                <button className="x" aria-label="Delete set" onClick={() => deleteSet(st.id)}><Icon name="close" size={18} /></button>
              </li>
            )
          })}
        </ol>
      )}

      <div className="entry">
        {variants && variants.length > 1 && (
          <div className="seg variants" role="group" aria-label="Variant">
            {variants.map((v) => (
              <button
                key={v.id}
                aria-pressed={v.id === exercise.id}
                disabled={v.id !== exercise.id && sets.length > 0}
                onClick={() => v.id !== exercise.id && onSwap?.(v.id)}
                title={v.name}
              >
                {variantLabel(v, variants)}
              </button>
            ))}
          </div>
        )}
        {suggestion?.progressedKg && workingDone === 0 && (
          <p className="hint">
            <Icon name="progress" size={16} /> You hit every rep last time: +{fmtNum(suggestion.progressedKg)} kg today
          </p>
        )}
        {logType === 'weight_reps' && (
          <div className="pair">
            <Stepper label="Weight (kg)" value={weight} onChange={setWeight} step={2.5} decimal placeholder="–" />
            <Stepper label="Reps" value={reps} onChange={setReps} step={1} placeholder="–" />
          </div>
        )}
        {logType === 'bodyweight_reps' && (
          <div className="pair">
            <Stepper label="Reps" value={reps} onChange={setReps} step={1} />
            <Stepper label="Added kg (optional)" value={weight} onChange={setWeight} step={2.5} decimal />
          </div>
        )}
        {logType === 'duration' && (
          <div className="pair">
            <Stepper label="Seconds" value={secs} onChange={setSecs} step={5} />
            <Stepper label="Added kg (optional)" value={weight} onChange={setWeight} step={2.5} decimal />
          </div>
        )}
        <div className="entry-actions">
          <button type="button" className={warmup ? 'chip warm-on' : 'chip'} aria-pressed={warmup} onClick={() => setWarmup(!warmup)}>Warm-up</button>
          <button className="btn" onClick={submit} disabled={!valid}>Log set</button>
        </div>
      </div>
    </article>
  )
}
