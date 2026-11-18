import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { regimeGoals } from '../db/routines'
import { useProfile } from '../profileContext'
import { addDays, sameDay, startOfWeek } from '../lib/dates'
import { useNow } from '../lib/hooks'
import { personalBests, weeksOnTrack } from '../lib/stats'
import { plural } from '../lib/format'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import WorkoutChooser from '../components/WorkoutChooser'

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

interface Props {
  onOpenLog: () => void
  onOpenProgress: () => void
  onOpenRegime: () => void
}

export default function Today({ onOpenLog, onOpenProgress, onOpenRegime }: Props) {
  const { active } = useProfile()
  const now = useNow(60_000)
  const today = new Date(now)
  const weekStart = startOfWeek(today)

  const data = useLiveQuery(async () => {
    if (!active) return null
    const workouts = await db.workouts.where('profileId').equals(active.id).toArray()
    const routineCount = await db.routines.where('profileId').equals(active.id).count()
    const finished = workouts.filter((w) => w.finishedAt)
    const inProgress = workouts.find((w) => !w.finishedAt)
    return {
      routineCount,
      inProgress,
      inProgressSets: inProgress ? await db.sets.where('workoutId').equals(inProgress.id).count() : 0,
      starts: finished.map((w) => w.startedAt),
      topGain: (await personalBests(active.id)).find((b) => b.gain),
    }
  }, [active?.id])

  if (!active || !data) return null

  const { weeklyGoal, streakMin } = regimeGoals(active, data.routineCount)
  // Only show a goal the user actually has (a regime or an explicit goal); never invent one.
  const hasGoal = data.routineCount > 0 || active.weeklyGoal !== undefined
  const ws = weekStart.getTime()
  const thisWeek = data.starts.filter((t) => t >= ws)
  const streak = weeksOnTrack(data.starts, streakMin, today)

  return (
    <>
      <PageHeader eyebrow={today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} title="Today" />

      <div className="week" aria-label="This week">
        {DAY_LETTERS.map((letter, i) => {
          const d = addDays(weekStart, i)
          const done = thisWeek.some((t) => sameDay(new Date(t), d))
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
          <h2>{data.inProgress.name}</h2>
          <p className="sub">
            Started {new Date(data.inProgress.startedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} ·{' '}
            {plural(data.inProgress.exerciseIds.length, 'exercise')} · {plural(data.inProgressSets, 'set')}
          </p>
          <button className="btn" onClick={onOpenLog}>Continue session</button>
        </section>
      ) : (
        <WorkoutChooser onStarted={onOpenLog} onOpenRegime={onOpenRegime} />
      )}

      <div className="tiles">
        <div className="tile">
          <div className="label">This week</div>
          {hasGoal ? (
            <>
              <div className="big">{thisWeek.length}<small> / {weeklyGoal}</small></div>
              <div className="bar"><i style={{ width: `${Math.min(100, (thisWeek.length / weeklyGoal) * 100)}%` }} /></div>
            </>
          ) : (
            <div className="big">{thisWeek.length}<small> {thisWeek.length === 1 ? 'workout' : 'workouts'}</small></div>
          )}
        </div>
        <div className="tile">
          <div className="label">Streak</div>
          <div className="big">{streak}<small> {streak === 1 ? 'week' : 'weeks'}</small></div>
          <div className="delta flat">{streakMin}+ sessions a week</div>
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
