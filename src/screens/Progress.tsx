import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { useProfile } from '../profileContext'
import { personalBests } from '../lib/stats'
import { relativeDay } from '../lib/dates'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'

export default function Progress() {
  const { active } = useProfile()
  const data = useLiveQuery(async () => {
    if (!active) return null
    const workouts = await db.workouts.where('profileId').equals(active.id).filter((w) => !!w.finishedAt).toArray()
    const ids = workouts.map((w) => w.id)
    const sets = ids.length ? await db.sets.where('workoutId').anyOf(ids).filter((s) => s.type === 'working').count() : 0
    return { workouts: workouts.length, sets, bests: await personalBests(active.id) }
  }, [active?.id])

  if (!data) return null

  return (
    <>
      <PageHeader eyebrow="Your progress" title="Progress" />

      <div className="tiles">
        <div className="tile">
          <div className="label">Workouts</div>
          <div className="big">{data.workouts}</div>
        </div>
        <div className="tile">
          <div className="label">Working sets</div>
          <div className="big">{data.sets}</div>
        </div>
      </div>

      <h2 className="section">Personal bests</h2>
      {data.bests.length === 0 ? (
        <div className="card empty">
          <span className="accent-text"><Icon name="trophy" size={32} /></span>
          <p>Log a few workouts and your personal bests show up here, with how far you've come.</p>
        </div>
      ) : (
        data.bests.map((b) => (
          <article className="card" key={b.exercise.id}>
            <div className="ex-head">
              <h3>{b.exercise.name}</h3>
              <span className="sub">{relativeDay(b.lastAt)}</span>
            </div>
            <div className="big" style={{ marginTop: 8 }}>{b.value}<small> {b.unit}</small></div>
            <span className="sub">{b.detail} · {b.sessions} {b.sessions === 1 ? 'session' : 'sessions'}</span>
            {b.gain && <span className="delta-pill">▲ {b.gain}</span>}
          </article>
        ))
      )}

      <p className="empty" style={{ paddingTop: 8 }}>Coming next: muscle insights, body map and progress charts.</p>
    </>
  )
}
