import { useCallback, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Exercise, type Workout } from '../db/db'
import { addExercise, discardWorkout, finishWorkout, startWorkout } from '../db/workouts'
import { useProfile } from '../profileContext'
import { primeAudio } from '../lib/beep'
import { usePersisted, useNow } from '../lib/hooks'
import { fmtClock } from '../lib/format'
import ExerciseCard from '../components/ExerciseCard'
import ExercisePicker from '../components/ExercisePicker'
import RestTimer from '../components/RestTimer'

export default function WorkoutScreen() {
  const { active } = useProfile()
  const state = useLiveQuery(
    async () => ({
      workout: active ? await db.workouts.where('profileId').equals(active.id).filter((w) => !w.finishedAt).first() : undefined,
    }),
    [active?.id],
    null,
  )
  if (!active || !state) return null
  return state.workout ? <ActiveWorkout key={state.workout.id} workout={state.workout} /> : <Start profileId={active.id} />
}

function Start({ profileId }: { profileId: number }) {
  const recent = useLiveQuery(
    async () => {
      const done = (await db.workouts.where('profileId').equals(profileId).filter((w) => !!w.finishedAt).toArray())
        .sort((a, b) => b.startedAt - a.startedAt)
        .slice(0, 5)
      return Promise.all(
        done.map(async (w) => ({ w, sets: await db.sets.where('workoutId').equals(w.id).count() })),
      )
    },
    [profileId],
    [],
  )
  return (
    <section>
      <button className="primary big" onClick={() => startWorkout(profileId)}>Start workout</button>
      {recent.length > 0 && (
        <>
          <h2>Recent</h2>
          <ul className="list">
            {recent.map(({ w, sets }) => (
              <li key={w.id} className="recent">
                <span>{new Date(w.startedAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                <span className="muted">{w.exerciseIds.length} exercises · {sets} sets</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

const REST_OPTIONS = [60, 90, 120, 180, 240, 300]

function ActiveWorkout({ workout }: { workout: Workout }) {
  const [picking, setPicking] = useState(false)
  const [confirm, setConfirm] = useState<'finish' | 'discard' | null>(null)
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null)
  const [auto, setAuto] = usePersisted('gymtracker.restAuto', false)
  const [restSec, setRestSec] = usePersisted('gymtracker.restSec', 90)
  const now = useNow(30_000)

  const exercises = useLiveQuery(
    async () => (await db.exercises.bulkGet(workout.exerciseIds)).filter((e): e is Exercise => !!e),
    [workout.exerciseIds.join()],
    [] as Exercise[],
  )
  const setCount = useLiveQuery(() => db.sets.where('workoutId').equals(workout.id).count(), [workout.id], 0)

  const startRest = () => {
    primeAudio()
    setRestEndsAt(Date.now() + restSec * 1000)
  }
  const onLogged = useCallback(() => {
    if (auto) startRest()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- startRest only reads restSec
  }, [auto, restSec])

  if (picking) {
    return (
      <ExercisePicker
        excludeIds={workout.exerciseIds}
        onClose={() => setPicking(false)}
        onPick={async (e) => {
          await addExercise(workout.id, e.id)
          setPicking(false)
        }}
      />
    )
  }

  return (
    <section>
      <div className="row between">
        <h2>Workout</h2>
        <span className="muted">{Math.floor((now - workout.startedAt) / 60000)} min · {setCount} sets</span>
      </div>

      <div className="rest-settings">
        <label className="check">
          <input type="checkbox" checked={auto} onChange={(e) => { setAuto(e.target.checked); if (e.target.checked) primeAudio() }} />
          Auto-start rest timer
        </label>
        <select aria-label="Rest duration" value={restSec} onChange={(e) => setRestSec(Number(e.target.value))}>
          {REST_OPTIONS.map((s) => <option key={s} value={s}>{fmtClock(s)}</option>)}
        </select>
        <button className="chip" onClick={startRest}>Start now</button>
      </div>

      {exercises.map((e) => (
        <ExerciseCard key={e.id} workout={workout} exercise={e} onLogged={onLogged} />
      ))}

      <button className="primary big" onClick={() => setPicking(true)}>+ Add exercise</button>

      <div className="row finish">
        {confirm === 'discard' ? (
          <>
            <button className="danger grow" onClick={() => discardWorkout(workout.id)}>Yes, discard everything</button>
            <button className="chip" onClick={() => setConfirm(null)}>Cancel</button>
          </>
        ) : confirm === 'finish' ? (
          <>
            <button className="primary grow" onClick={() => finishWorkout(workout.id)}>Yes, finish ({setCount} sets)</button>
            <button className="chip" onClick={() => setConfirm(null)}>Cancel</button>
          </>
        ) : (
          <>
            <button className="primary grow" onClick={() => setConfirm(setCount > 0 ? 'finish' : 'discard')}>
              {setCount > 0 ? 'Finish workout' : 'Cancel workout'}
            </button>
            {setCount > 0 && <button className="danger" onClick={() => setConfirm('discard')}>Discard</button>}
          </>
        )}
      </div>

      {restEndsAt !== null && (
        <>
          <div className="rest-spacer" />
          <RestTimer endsAt={restEndsAt} onChange={setRestEndsAt} />
        </>
      )}
    </section>
  )
}
