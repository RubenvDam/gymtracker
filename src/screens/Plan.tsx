import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Routine } from '../db/db'
import { applyTemplate, copyPlan, createRoutine, setScheduleDay, WEEKDAYS } from '../db/routines'
import { PLAN_TEMPLATES } from '../db/templates'
import { useProfile } from '../profileContext'
import { plural } from '../lib/format'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import RoutineEditor from './RoutineEditor'

/** Profile → Routines & weekly plan. */
export default function PlanScreen({ onBack }: { onBack: () => void }) {
  const { active, profiles } = useProfile()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [confirmCopy, setConfirmCopy] = useState<number | null>(null)

  const routines = useLiveQuery(
    () => (active ? db.routines.where('profileId').equals(active.id).sortBy('createdAt') : Promise.resolve([] as Routine[])),
    [active?.id],
    null,
  )
  const editing = useLiveQuery(() => (editingId !== null ? db.routines.get(editingId) : undefined), [editingId])
  // Other profiles that have a plan this profile could copy.
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

  const schedule = active.schedule ?? Array(7).fill(null)
  const newRoutine = async () => open(await createRoutine(active.id))
  const daysFor = (id: number) =>
    schedule.flatMap((x, i) => (x === id ? [WEEKDAYS[i].slice(0, 3)] : [])).join(', ')

  const copyRows = others.map((o) =>
    confirmCopy === o.id ? (
      <div className="card" key={o.id}>
        <p className="sub" style={{ marginTop: 0 }}>
          Adds {plural(o.count, 'routine')} from {o.name} and uses their weekly plan. Your logged workouts are not affected.
        </p>
        <div className="btn-row">
          <button className="btn" onClick={async () => { await copyPlan(o.id, active.id); setConfirmCopy(null) }}>Copy plan</button>
          <button className="btn secondary inline" onClick={() => setConfirmCopy(null)}>Cancel</button>
        </div>
      </div>
    ) : (
      <button key={o.id} className="btn secondary" onClick={() => setConfirmCopy(o.id)}>Copy {o.name}'s plan</button>
    ),
  )

  return (
    <>
      <PageHeader eyebrow="Routines & weekly plan" title="Plan" onBack={onBack} />

      {routines.length === 0 ? (
        <>
          <section className="card hero">
            <span className="pill neutral">Get started</span>
            <h2>Build your plan</h2>
            <p className="sub">Create routines, then assign them to weekdays. Today will show what's planned, and Log lets you start any routine.</p>
            <div className="stack">
              {PLAN_TEMPLATES.map((t) => (
                <div key={t.id}>
                  <button className="btn" onClick={() => applyTemplate(active.id, t)}>Use “{t.name}”</button>
                  <p className="sub" style={{ margin: '8px 4px 0' }}>{t.description}</p>
                </div>
              ))}
              <button className="btn secondary" onClick={newRoutine}>Start from scratch</button>
            </div>
          </section>
          <div className="stack">{copyRows}</div>
        </>
      ) : (
        <>
          <h2 className="section" style={{ marginTop: 4 }}>Weekly plan</h2>
          <div className="group">
            {WEEKDAYS.map((day, i) => (
              <label className="group-row" key={day}>
                <span className="grow">{day}</span>
                <select
                  className="inline-select"
                  aria-label={`${day} routine`}
                  value={schedule[i] ?? ''}
                  onChange={(e) => setScheduleDay(active.id, i, e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Rest</option>
                  {routines.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </label>
            ))}
          </div>

          <h2 className="section">Routines</h2>
          <div className="group">
            {routines.map((r) => (
              <button key={r.id} className="group-row" onClick={() => open(r.id)}>
                <span className="two-line">
                  <span className="name">{r.name}</span>
                  <span className="sub">{plural(r.items.length, 'exercise')}{daysFor(r.id) && ` · ${daysFor(r.id)}`}</span>
                </span>
                {r.label && <span className="badge on">{r.label}</span>}
                <span className="chev"><Icon name="chevronRight" size={20} /></span>
              </button>
            ))}
          </div>
          <div className="stack">
            <button className="btn secondary" onClick={newRoutine}>+ New routine</button>
            {copyRows}
          </div>
        </>
      )}
    </>
  )
}
