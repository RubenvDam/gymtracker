import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Routine } from '../db/db'
import { startWorkout } from '../db/workouts'
import { regimeGoals, startFromRoutine } from '../db/routines'
import { useProfile } from '../profileContext'
import { startOfWeek } from '../lib/dates'
import { plural } from '../lib/format'
import { useNow } from '../lib/hooks'
import Icon from './Icon'

interface Props {
  /** Called after a session was created (e.g. to switch to the Log tab). */
  onStarted?: () => void
  onOpenRegime: () => void
}

/**
 * The "what are we training?" card: pick one of your preset workouts, or quick log.
 * Workouts already done this week get a tick so you can see what's left; nothing is pre-chosen.
 */
export default function WorkoutChooser({ onStarted, onOpenRegime }: Props) {
  const { active } = useProfile()
  const now = useNow(60_000)
  const weekStart = startOfWeek(new Date(now)).getTime()

  const data = useLiveQuery(async () => {
    if (!active) return null
    const routines = await db.routines.where('profileId').equals(active.id).sortBy('createdAt')
    const thisWeek = await db.workouts
      .where('profileId').equals(active.id)
      .filter((w) => !!w.finishedAt && w.startedAt >= weekStart)
      .toArray()
    const doneOn = new Map<number, number>()
    for (const w of thisWeek) if (w.routineId !== undefined) doneOn.set(w.routineId, Math.max(doneOn.get(w.routineId) ?? 0, w.startedAt))
    const last = (await db.workouts.where('profileId').equals(active.id).filter((w) => !!w.finishedAt).sortBy('startedAt')).at(-1)
    return { routines, sessionsThisWeek: thisWeek.length, doneOn, last }
  }, [active?.id, weekStart])

  if (!active || !data) return null

  const quickLog = async () => {
    await startWorkout(active.id)
    onStarted?.()
  }
  const start = async (r: Routine) => {
    await startFromRoutine(active.id, r.id)
    onStarted?.()
  }

  if (data.routines.length === 0) {
    return (
      <section className="card hero">
        <span className="pill neutral">Quick log</span>
        <h2>Ready to train?</h2>
        <p className="sub">Add exercises as you go, or set up your regime with preset workouts to choose from.</p>
        <button className="btn" onClick={quickLog}>Start workout</button>
        <button className="btn-text full" onClick={onOpenRegime}>Set up your regime</button>
      </section>
    )
  }

  const { weeklyGoal } = regimeGoals(active, data.routines.length)
  const remaining = weeklyGoal - data.sessionsThisWeek

  return (
    <section className="card hero">
      <span className="pill">{data.sessionsThisWeek} / {weeklyGoal} this week</span>
      <h2>What are we training?</h2>
      <p className="sub">{remaining > 0 ? `${plural(remaining, 'session')} to go this week.` : 'Weekly goal reached. Anything extra is a bonus.'}</p>
      <div className="choices">
        {data.routines.map((r) => {
          const done = data.doneOn.get(r.id)
          return (
            <button key={r.id} className="choice" onClick={() => start(r)}>
              <span className="two-line">
                <span className="name">{r.name}</span>
                <span className="sub">{plural(r.items.length, 'exercise')}{r.label && ` · ${r.label}`}</span>
              </span>
              {done ? (
                <span className="badge done">
                  <Icon name="check" size={13} /> {new Date(done).toLocaleDateString('en-GB', { weekday: 'short' })}
                </span>
              ) : (
                <span className="start-arrow" aria-hidden="true"><Icon name="chevronRight" size={20} /></span>
              )}
            </button>
          )
        })}
      </div>
      <button className="btn secondary" onClick={quickLog}>Quick log (choose exercises yourself)</button>
    </section>
  )
}
