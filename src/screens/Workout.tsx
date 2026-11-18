import { useCallback, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Exercise, type Routine, type Workout } from '../db/db'
import { addExercise, discardWorkout, finishWorkout, startWorkout } from '../db/workouts'
import { startFromRoutine, swapVariant, weekdayIndex } from '../db/routines'
import { useProfile } from '../profileContext'
import { primeAudio } from '../lib/beep'
import { usePersisted, useNow } from '../lib/hooks'
import { fmtClock, plural } from '../lib/format'
import { relativeDay } from '../lib/dates'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import ExerciseCard from '../components/ExerciseCard'
import ExercisePicker from '../components/ExercisePicker'
import RestTimer from '../components/RestTimer'

export default function WorkoutScreen({ onOpenPlan }: { onOpenPlan: () => void }) {
  const { active } = useProfile()
  const state = useLiveQuery(
    async () => ({
      workout: active ? await db.workouts.where('profileId').equals(active.id).filter((w) => !w.finishedAt).first() : undefined,
    }),
    [active?.id],
    null,
  )
  if (!active || !state) return null
  return state.workout ? (
    <ActiveWorkout key={state.workout.id} workout={state.workout} />
  ) : (
    <Start profileId={active.id} onOpenPlan={onOpenPlan} />
  )
}

function Start({ profileId, onOpenPlan }: { profileId: number; onOpenPlan: () => void }) {
  const { active } = useProfile()
  const recent = useLiveQuery(
    async () => {
      const done = (await db.workouts.where('profileId').equals(profileId).filter((w) => !!w.finishedAt).toArray())
        .sort((a, b) => b.startedAt - a.startedAt)
        .slice(0, 5)
      return Promise.all(done.map(async (w) => ({ w, sets: await db.sets.where('workoutId').equals(w.id).count() })))
    },
    [profileId],
    [],
  )
  const routines = useLiveQuery(() => db.routines.where('profileId').equals(profileId).sortBy('createdAt'), [profileId], [] as Routine[])
  const now = useNow(60_000)
  const todayId = active?.schedule?.[weekdayIndex(new Date(now))] ?? null
  const ordered = [...routines].sort((a, b) => Number(b.id === todayId) - Number(a.id === todayId))

  return (
    <>
      <PageHeader eyebrow="Log" title="Workout" />
      {routines.length > 0 ? (
        <>
          <h2 className="section" style={{ marginTop: 4 }}>Start a routine</h2>
          <div className="group">
            {ordered.map((r) => (
              <button key={r.id} className="group-row routine" onClick={() => startFromRoutine(profileId, r.id)}>
                <span className="two-line">
                  <span className="name">{r.name}</span>
                  <span className="sub">{plural(r.items.length, 'exercise')}{r.label && ` · ${r.label}`}</span>
                </span>
                {r.id === todayId && <span className="badge on">Today</span>}
                <span className="chev"><Icon name="chevronRight" size={20} /></span>
              </button>
            ))}
          </div>
          <button className="btn secondary" onClick={() => startWorkout(profileId)}>Quick log (empty workout)</button>
        </>
      ) : (
        <section className="card hero">
          <span className="pill neutral">Quick log</span>
          <h2>Start a workout</h2>
          <p className="sub">Add exercises as you go, or build routines to start from.</p>
          <button className="btn" onClick={() => startWorkout(profileId)}>Start workout</button>
          <button className="btn-text" style={{ width: '100%', marginTop: 8 }} onClick={onOpenPlan}>Build your routines</button>
        </section>
      )}
      {recent.length > 0 && (
        <>
          <h2 className="section">Recent</h2>
          <div className="group">
            {recent.map(({ w, sets }) => (
              <div key={w.id} className="group-row recent">
                <span className="two-line">
                  <span className="name">{w.name}</span>
                  <span className="sub">{new Date(w.startedAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · {relativeDay(w.startedAt)}</span>
                </span>
                <span className="meta">{plural(w.exerciseIds.length, 'exercise')} · {plural(sets, 'set')}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
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
  // Routine targets + all variant exercises, when started from a routine.
  const plan = useLiveQuery(async () => {
    const routine = workout.routineId ? await db.routines.get(workout.routineId) : undefined
    if (!routine) return null
    const ids = [...new Set(routine.items.flatMap((i) => i.exerciseIds))]
    const byId = new Map((await db.exercises.bulkGet(ids)).filter((e): e is Exercise => !!e).map((e) => [e.id, e]))
    return { routine, byId }
  }, [workout.routineId])

  const slotFor = (exerciseId: string) => plan?.routine.items.find((i) => i.exerciseIds.includes(exerciseId))
  const variantsFor = (exerciseId: string) => {
    const item = slotFor(exerciseId)
    if (!item || item.exerciseIds.length < 2 || !plan) return undefined
    return item.exerciseIds.map((id) => plan.byId.get(id)).filter((e): e is Exercise => !!e)
  }

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

  const minutes = Math.floor((now - workout.startedAt) / 60000)

  return (
    <>
      <PageHeader eyebrow={`In progress · ${minutes} min · ${plural(setCount, 'set')}`} title={workout.name} />

      <section className="card rest-card">
        <span className="row-icon"><Icon name="timer" size={20} /></span>
        <span className="two-line">
          <span className="name">Rest timer</span>
          <span className="sub">Auto-start after each set</span>
        </span>
        <label className="switch">
          <input
            type="checkbox"
            role="switch"
            aria-label="Auto-start rest timer"
            checked={auto}
            onChange={(e) => {
              setAuto(e.target.checked)
              if (e.target.checked) primeAudio()
            }}
          />
        </label>
        <div className="controls">
          <select aria-label="Rest duration" value={restSec} onChange={(e) => setRestSec(Number(e.target.value))}>
            {REST_OPTIONS.map((s) => <option key={s} value={s}>{fmtClock(s)} rest</option>)}
          </select>
          <button className="btn secondary inline" onClick={startRest}>Start now</button>
        </div>
      </section>

      {exercises.map((e) => (
        <ExerciseCard
          key={e.id}
          workout={workout}
          exercise={e}
          onLogged={onLogged}
          target={slotFor(e.id)}
          variants={variantsFor(e.id)}
          onSwap={(toId) => void swapVariant(workout.id, e.id, toId)}
        />
      ))}

      {exercises.length === 0 && <p className="empty">Add your first exercise to start logging.</p>}

      <button className="btn secondary" onClick={() => setPicking(true)}>+ Add exercise</button>

      <div className="btn-row" style={{ marginTop: 24 }}>
        {confirm === 'discard' ? (
          <>
            <button className="btn danger" onClick={() => discardWorkout(workout.id)}>Yes, discard everything</button>
            <button className="btn secondary inline" onClick={() => setConfirm(null)}>Cancel</button>
          </>
        ) : confirm === 'finish' ? (
          <>
            <button className="btn" onClick={() => finishWorkout(workout.id)}>Yes, finish ({setCount} sets)</button>
            <button className="btn secondary inline" onClick={() => setConfirm(null)}>Cancel</button>
          </>
        ) : (
          <>
            <button className="btn" onClick={() => setConfirm(setCount > 0 ? 'finish' : 'discard')}>
              {setCount > 0 ? 'Finish workout' : 'Cancel workout'}
            </button>
            {setCount > 0 && <button className="btn danger inline" onClick={() => setConfirm('discard')}>Discard</button>}
          </>
        )}
      </div>

      {restEndsAt !== null && (
        <>
          <div className="rest-spacer" />
          <RestTimer endsAt={restEndsAt} onChange={setRestEndsAt} />
        </>
      )}
    </>
  )
}
