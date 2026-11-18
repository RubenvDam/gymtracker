import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Routine } from '../db/db'
import { applyTemplate, copyPlan, createRoutine, regimeGoals, setRegimeGoals } from '../db/routines'
import { PLAN_TEMPLATES } from '../db/templates'
import { useProfile } from '../profileContext'
import { plural } from '../lib/format'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import RoutineEditor from './RoutineEditor'

/** Profile → Regime: your preset workouts plus a weekly goal. Not tied to weekdays. */
export default function RegimeScreen({ onBack }: { onBack: () => void }) {
  const { active, profiles } = useProfile()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [confirmCopy, setConfirmCopy] = useState<number | null>(null)

  const routines = useLiveQuery(
    () => (active ? db.routines.where('profileId').equals(active.id).sortBy('createdAt') : Promise.resolve([] as Routine[])),
    [active?.id],
    null,
  )
  const editing = useLiveQuery(() => (editingId !== null ? db.routines.get(editingId) : undefined), [editingId])
  // Other profiles with workouts this profile could copy.
  const others = useLiveQuery(
    async () => {
      const out: { id: number; name: string; count: number }[] = []
      for (const p of profiles) {
        if (p.id === active?.id) continue
        const count = await db.routines.where('profileId').equals(p.id).count()
        if (count) out.push({ id: p.id, name: p.name, count })
      }
      return out
    },
    [profiles.map((p) => `${p.id}:${p.name}`).join(), active?.id],
    [],
  )

  if (!active || !routines) return null

  const open = (id: number) => {
    setEditingId(id)
    window.scrollTo(0, 0)
  }
  if (editingId !== null) {
    if (!editing) return null
    return <RoutineEditor key={editing.id} initial={editing} onBack={() => setEditingId(null)} />
  }

  const { weeklyGoal, streakMin } = regimeGoals(active, routines.length)
  const newWorkout = async () => open(await createRoutine(active.id))

  const copyRows = others.map((o) =>
    confirmCopy === o.id ? (
      <div className="card" key={o.id}>
        <p className="sub" style={{ marginTop: 0 }}>
          Adds {plural(o.count, 'workout')} from {o.name} and uses their weekly goal. Your sessions are not affected.
        </p>
        <div className="btn-row">
          <button className="btn" onClick={async () => { await copyPlan(o.id, active.id); setConfirmCopy(null) }}>Copy regime</button>
          <button className="btn secondary inline" onClick={() => setConfirmCopy(null)}>Cancel</button>
        </div>
      </div>
    ) : (
      <button key={o.id} className="btn secondary" onClick={() => setConfirmCopy(o.id)}>Copy {o.name}'s regime</button>
    ),
  )

  return (
    <>
      <PageHeader eyebrow="Your preset workouts & weekly goal" title="Regime" onBack={onBack} />

      {routines.length === 0 ? (
        <>
          <section className="card hero">
            <span className="pill neutral">Get started</span>
            <h2>Build your regime</h2>
            <p className="sub">Create preset workouts (like Lower A or Upper B) and set how many sessions you aim for each week. You pick which workout to do every time you train.</p>
            <div className="stack">
              {PLAN_TEMPLATES.map((t) => (
                <div key={t.id}>
                  <button className="btn" onClick={() => applyTemplate(active.id, t)}>Use “{t.name}”</button>
                  <p className="sub" style={{ margin: '8px 4px 0' }}>{t.description}</p>
                </div>
              ))}
              <button className="btn secondary" onClick={newWorkout}>Start from scratch</button>
            </div>
          </section>
          <div className="stack">{copyRows}</div>
        </>
      ) : (
        <>
          <h2 className="section" style={{ marginTop: 4 }}>Weekly goal</h2>
          <div className="group">
            <Counter
              label="Sessions per week"
              hint="Any of your workouts, any day"
              value={weeklyGoal}
              min={1}
              max={14}
              onChange={(n) => setRegimeGoals(active.id, { weeklyGoal: n, streakMin: Math.min(streakMin, n) })}
            />
            <Counter
              label="Streak counts from"
              hint="A week with at least this many sessions keeps your streak"
              value={streakMin}
              min={1}
              max={weeklyGoal}
              onChange={(n) => setRegimeGoals(active.id, { weeklyGoal, streakMin: n })}
            />
          </div>

          <h2 className="section">Workouts</h2>
          <div className="group">
            {routines.map((r) => (
              <button key={r.id} className="group-row" onClick={() => open(r.id)}>
                <span className="two-line">
                  <span className="name">{r.name}</span>
                  <span className="sub">{plural(r.items.length, 'exercise')}</span>
                </span>
                {r.label && <span className="badge on">{r.label}</span>}
                <span className="chev"><Icon name="chevronRight" size={20} /></span>
              </button>
            ))}
          </div>
          <div className="stack">
            <button className="btn secondary" onClick={newWorkout}>+ New workout</button>
            {copyRows}
          </div>
        </>
      )}
    </>
  )
}

function Counter(props: { label: string; hint: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  const { label, hint, value, min, max, onChange } = props
  return (
    <div className="group-row">
      <span className="two-line">
        <span className="name">{label}</span>
        <span className="sub">{hint}</span>
      </span>
      <div className="counter">
        <button aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}>−</button>
        <output aria-label={label}>{value}</output>
        <button aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}>+</button>
      </div>
    </div>
  )
}
