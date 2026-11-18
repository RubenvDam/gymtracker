import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Exercise, type SetEntry, type Workout } from '../db/db'
import { deleteSet, logSet, removeExercise, suggestNext } from '../db/workouts'
import { cap, describeSet, fmtNum, parseNum } from '../lib/format'
import Stepper from './Stepper'
import Icon from './Icon'

interface Props {
  workout: Workout
  exercise: Exercise
  onLogged: () => void
}

export default function ExerciseCard({ workout, exercise, onLogged }: Props) {
  const { logType } = exercise
  const sets = useLiveQuery(
    () => db.sets.where('workoutId').equals(workout.id).filter((s) => s.exerciseId === exercise.id).sortBy('order'),
    [workout.id, exercise.id],
    [] as SetEntry[],
  )
  // Re-run whenever a set is added/removed so the prefill advances to the next set number.
  const suggestion = useLiveQuery(
    () => suggestNext(workout.profileId, workout.id, exercise.id),
    [workout.profileId, workout.id, exercise.id, sets.map((s) => `${s.id}${s.type}`).join()],
    null,
  )

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
          <span className="sub">{exercise.primaryMuscles.map(cap).join(', ')}</span>
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
        {logType === 'weight_reps' && (
          <div className="pair">
            <Stepper label="Weight (kg)" value={weight} onChange={setWeight} step={2.5} decimal />
            <Stepper label="Reps" value={reps} onChange={setReps} step={1} />
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
