import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Exercise, type Routine } from '../db/db'
import { startWorkout } from '../db/workouts'
import { formatTarget, startFromRoutine, WEEKDAYS, weekdayIndex } from '../db/routines'
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
  onOpenPlan: () => void
}

export default function Today({ onOpenLog, onOpenProgress, onOpenPlan }: Props) {
  const { active } = useProfile()
  const now = useNow(60_000)
  const today = new Date(now)
  const weekStart = startOfWeek(today)
  const schedule = active?.schedule ?? Array<number | null>(7).fill(null)
  const todayIdx = weekdayIndex(today)

  const data = useLiveQuery(async () => {
    if (!active) return null
    const workouts = await db.workouts.where('profileId').equals(active.id).toArray()
    const routines = await db.routines.where('profileId').equals(active.id).toArray()
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

    const todayRoutine = routines.find((r) => r.id === schedule[todayIdx])
    // Preview of today's planned exercises (default variants).
    const previewIds = todayRoutine?.items.slice(0, 4).map((i) => i.exerciseIds[0]) ?? []
    const preview = (await db.exercises.bulkGet(previewIds)).filter((e): e is Exercise => !!e)

    return {
      routines,
      inProgress,
      inProgressSets: inProgress ? await db.sets.where('workoutId').equals(inProgress.id).count() : 0,
      trainedDays: thisWeek.map((w) => new Date(w.startedAt)),
      doneToday: finished.filter((w) => sameDay(new Date(w.startedAt), today)),
      workoutsThisWeek: thisWeek.length,
      setsThisWeek,
      setsLastWeek: working.length - setsThisWeek,
      last: finished[0],
      lastSets: finished[0] ? await db.sets.where('workoutId').equals(finished[0].id).count() : 0,
      todayRoutine,
      preview,
      topGain: (await personalBests(active.id)).find((b) => b.gain),
    }
  }, [active?.id, weekStart.getTime(), schedule.join(), todayIdx])

  if (!active || !data) return null

  const hasPlan = data.routines.length > 0 && schedule.some((x) => x !== null)
  const plannedThisWeek = schedule.filter((x) => x !== null).length
  const setDelta = data.setsThisWeek - data.setsLastWeek
  const byId = new Map<number, Routine>(data.routines.map((r) => [r.id, r]))

  // Next planned session after today (wrapping into next week).
  let next: { routine: Routine; day: string } | undefined
  for (let k = 1; k <= 7 && !next; k++) {
    const r = byId.get(schedule[(todayIdx + k) % 7] ?? -1)
    if (r) next = { routine: r, day: k === 1 ? 'tomorrow' : `on ${WEEKDAYS[(todayIdx + k) % 7]}` }
  }

  const quickLog = async () => {
    await startWorkout(active.id)
    onOpenLog()
  }
  const startPlanned = async () => {
    if (!data.todayRoutine) return
    await startFromRoutine(active.id, data.todayRoutine.id)
    onOpenLog()
  }
  const plannedDone = data.todayRoutine && data.doneToday.some((w) => w.routineId === data.todayRoutine!.id)

  let hero
  if (data.inProgress) {
    hero = (
      <section className="card hero">
        <span className="pill">● In progress</span>
        <h2>{data.inProgress.name}</h2>
        <p className="sub">
          Started {new Date(data.inProgress.startedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} ·{' '}
          {plural(data.inProgress.exerciseIds.length, 'exercise')} · {plural(data.inProgressSets, 'set')}
        </p>
        <button className="btn" onClick={onOpenLog}>Continue workout</button>
      </section>
    )
  } else if (data.todayRoutine && !plannedDone) {
    const r = data.todayRoutine
    hero = (
      <section className="card hero">
        <span className="pill">● Planned{r.label && ` · ${r.label}`}</span>
        <h2>{r.name}</h2>
        <p className="sub">{plural(r.items.length, 'exercise')}</p>
        <ul className="ex-preview">
          {r.items.slice(0, 4).map((it, i) => (
            <li key={it.key}>
              <span>{data.preview[i]?.name ?? '…'}</span>
              <span>{formatTarget(it, data.preview[i]?.logType === 'duration' ? 's' : 'reps')}</span>
            </li>
          ))}
          {r.items.length > 4 && <li className="more"><span>+ {plural(r.items.length - 4, 'more exercise')}</span></li>}
        </ul>
        <button className="btn" onClick={startPlanned}>Start {r.name}</button>
        <button className="btn-text muted full" onClick={quickLog}>Quick log instead</button>
      </section>
    )
  } else if (plannedDone) {
    hero = (
      <section className="card hero">
        <span className="pill positive"><Icon name="check" size={14} /> Done today</span>
        <h2>{data.todayRoutine!.name} complete</h2>
        <p className="sub">{next ? `Next up: ${next.routine.name} ${next.day}.` : 'Nice work.'} Rest well.</p>
        <button className="btn secondary" onClick={quickLog}>Log something extra</button>
      </section>
    )
  } else if (hasPlan) {
    hero = (
      <section className="card hero">
        <span className="pill neutral">Rest day</span>
        <h2>Recover today</h2>
        <p className="sub">{next ? `Next up: ${next.routine.name} ${next.day}.` : 'Nothing planned this week.'}</p>
        <button className="btn secondary" onClick={quickLog}>Quick log anyway</button>
      </section>
    )
  } else {
    hero = (
      <section className="card hero">
        <span className="pill neutral">Quick log</span>
        <h2>Ready to train?</h2>
        <p className="sub">
          {data.last
            ? `Last workout ${relativeDay(data.last.startedAt, today)} · ${plural(data.lastSets, 'set')}`
            : 'Log your first workout and your progress starts here.'}
        </p>
        <button className="btn" onClick={quickLog}>Start workout</button>
        <button className="btn-text full" onClick={onOpenPlan}>Set up your weekly plan</button>
      </section>
    )
  }

  return (
    <>
      <PageHeader eyebrow={today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} title="Today" />

      <div className="week" aria-label="This week">
        {DAY_LETTERS.map((letter, i) => {
          const d = addDays(weekStart, i)
          const done = data.trainedDays.some((t) => sameDay(t, d))
          const isToday = sameDay(d, today)
          const planned = byId.get(schedule[i] ?? -1)
          const cls = ['dot', done && 'done', isToday && 'today', !done && !isToday && d < today && 'past', !done && planned && 'planned']
            .filter(Boolean)
            .join(' ')
          const label = `${WEEKDAYS[i]}${planned ? `, ${planned.name} planned` : ''}${done ? ', trained' : ''}`
          return (
            <div className="day" key={i}>
              {letter}
              <div className={cls} aria-label={label} title={planned?.name}>
                {done ? <Icon name="check" size={18} /> : d.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {hero}

      <div className="tiles">
        <div className="tile">
          <div className="label">This week</div>
          {hasPlan ? (
            <>
              <div className="big">{data.workoutsThisWeek}<small> / {plannedThisWeek}</small></div>
              <div className="bar"><i style={{ width: `${Math.min(100, (data.workoutsThisWeek / plannedThisWeek) * 100)}%` }} /></div>
            </>
          ) : (
            <div className="big">{data.workoutsThisWeek}<small> {data.workoutsThisWeek === 1 ? 'workout' : 'workouts'}</small></div>
          )}
        </div>
        <div className="tile">
          <div className="label">Working sets</div>
          <div className="big">{data.setsThisWeek}</div>
          <div className={setDelta > 0 ? 'delta' : 'delta flat'}>{setDelta > 0 ? `+${setDelta}` : setDelta} vs last week</div>
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
