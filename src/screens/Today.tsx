import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { startWorkout } from '../db/workouts'
import { useProfile } from '../profileContext'
import { addDays, DAY_MS, relativeDay, sameDay, startOfWeek } from '../lib/dates'
import { useNow } from '../lib/hooks'
import { personalBests } from '../lib/stats'
import { plural } from '../lib/format'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

interface Props {
  onOpenLog: () => void
  onOpenProgress: () => void
}

export default function Today({ onOpenLog, onOpenProgress }: Props) {
  const { active } = useProfile()
  const now = useNow(60_000)
  const today = new Date(now)
  const weekStart = startOfWeek(today)

  const data = useLiveQuery(async () => {
    if (!active) return null
    const workouts = await db.workouts.where('profileId').equals(active.id).toArray()
    const ws = weekStart.getTime()
    const lastWs = ws - 7 * DAY_MS
    const inProgress = workouts.find((w) => !w.finishedAt)
    const finished = workouts.filter((w) => w.finishedAt).sort((a, b) => b.startedAt - a.startedAt)
    const thisWeek = finished.filter((w) => w.startedAt >= ws)

    const recentIds = workouts.filter((w) => w.startedAt >= lastWs).map((w) => w.id)
    const recentSets = recentIds.length ? await db.sets.where('workoutId').anyOf(recentIds).toArray() : []
    const startedAt = new Map(workouts.map((w) => [w.id, w.startedAt]))
    const working = recentSets.filter((s) => s.type === 'working')
    const setsThisWeek = working.filter((s) => startedAt.get(s.workoutId)! >= ws).length
    const setsLastWeek = working.length - setsThisWeek

    const last = finished[0]
    const lastSets = last ? await db.sets.where('workoutId').equals(last.id).count() : 0
    const inProgressSets = inProgress ? await db.sets.where('workoutId').equals(inProgress.id).count() : 0
    const topGain = (await personalBests(active.id)).find((b) => b.gain)

    return {
      inProgress,
      inProgressSets,
      trainedDays: thisWeek.map((w) => new Date(w.startedAt)),
      workoutsThisWeek: thisWeek.length,
      setsThisWeek,
      setsLastWeek,
      last,
      lastSets,
      topGain,
    }
  }, [active?.id, weekStart.getTime()])

  if (!active || !data) return null
  const setDelta = data.setsThisWeek - data.setsLastWeek

  const start = async () => {
    await startWorkout(active.id)
    onOpenLog()
  }

  return (
    <>
      <PageHeader eyebrow={today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} title="Today" />

      <div className="week" aria-label="This week">
        {DAY_LETTERS.map((letter, i) => {
          const d = addDays(weekStart, i)
          const done = data.trainedDays.some((t) => sameDay(t, d))
          const isToday = sameDay(d, today)
          const cls = ['dot', done && 'done', isToday && 'today', !done && !isToday && d < today && 'past'].filter(Boolean).join(' ')
          return (
            <div className="day" key={i}>
              {letter}
              <div className={cls} aria-label={`${d.toLocaleDateString('en-GB', { weekday: 'long' })}${done ? ', trained' : ''}`}>
                {done ? <Icon name="check" size={18} /> : d.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {data.inProgress ? (
        <section className="card hero">
          <span className="pill">● In progress</span>
          <h2>Workout</h2>
          <p className="sub">
            Started {new Date(data.inProgress.startedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} ·{' '}
            {plural(data.inProgress.exerciseIds.length, 'exercise')} · {plural(data.inProgressSets, 'set')}
          </p>
          <button className="btn" onClick={onOpenLog}>Continue workout</button>
        </section>
      ) : (
        <section className="card hero">
          <span className="pill neutral">Quick log</span>
          <h2>Ready to train?</h2>
          <p className="sub">
            {data.last
              ? `Last workout ${relativeDay(data.last.startedAt, today)} · ${plural(data.lastSets, 'set')}`
              : 'Log your first workout and your progress starts here.'}
          </p>
          <button className="btn" onClick={start}>Start workout</button>
        </section>
      )}

      <div className="tiles">
        <div className="tile">
          <div className="label">This week</div>
          <div className="big">{data.workoutsThisWeek}<small> {data.workoutsThisWeek === 1 ? 'workout' : 'workouts'}</small></div>
        </div>
        <div className="tile">
          <div className="label">Working sets</div>
          <div className="big">{data.setsThisWeek}</div>
          <div className={setDelta > 0 ? 'delta' : 'delta flat'}>
            {setDelta > 0 ? `+${setDelta}` : setDelta} vs last week
          </div>
        </div>
      </div>

      {data.topGain && (
        <button className="card group-row" onClick={onOpenProgress} style={{ padding: 16 }}>
          <span className="row-icon"><Icon name="trophy" size={20} /></span>
          <span className="two-line">
            <span className="name">{data.topGain.exercise.name}</span>
            <span className="sub">{data.topGain.gain}</span>
          </span>
          <span className="chev"><Icon name="chevronRight" size={20} /></span>
        </button>
      )}
    </>
  )
}
