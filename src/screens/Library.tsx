import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, MUSCLES, LOG_TYPE_LABELS, type Exercise, type LogType, type Muscle } from '../db/db'
import { cap } from '../lib/format'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'

export default function Library({ onBack }: { onBack: () => void }) {
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<Muscle | null>(null)
  const [editing, setEditing] = useState<Exercise | 'new' | null>(null)

  const all = useLiveQuery(() => db.exercises.orderBy('name').toArray(), [], [] as Exercise[])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all.filter((e) => (!q || e.name.toLowerCase().includes(q)) && (!muscle || e.primaryMuscles.includes(muscle)))
  }, [all, query, muscle])

  if (editing) return <ExerciseForm exercise={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />

  return (
    <>
      <PageHeader title="Exercises" onBack={onBack} />
      <div className="btn-row" style={{ marginTop: 0 }}>
        <input type="search" placeholder="Search exercises" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search exercises" />
        <button className="btn inline" style={{ flex: 'none' }} onClick={() => setEditing('new')}>+ New</button>
      </div>

      <div className="chips scroll" role="group" aria-label="Filter by primary muscle">
        <button className={muscle === null ? 'chip on' : 'chip'} onClick={() => setMuscle(null)}>All</button>
        {MUSCLES.map((m) => (
          <button key={m} className={muscle === m ? 'chip on' : 'chip'} onClick={() => setMuscle(muscle === m ? null : m)}>{cap(m)}</button>
        ))}
      </div>

      <p className="sub count" style={{ margin: '4px 4px 10px' }}>{shown.length} exercises</p>

      <div className="group">
        {shown.slice(0, 200).map((e) => (
          <button key={e.id} className="group-row item" onClick={() => setEditing(e)}>
            <span className="two-line">
              <span className="name">{e.name}{e.custom && <span className="accent-text" style={{ fontSize: 13 }}>&nbsp;· custom</span>}</span>
              <span className="sub">{e.primaryMuscles.map(cap).join(', ') || '—'} · {cap(e.equipment)} · {LOG_TYPE_LABELS[e.logType].split(' (')[0]}</span>
            </span>
            <span className="chev"><Icon name="chevronRight" size={18} /></span>
          </button>
        ))}
      </div>
      {shown.length > 200 && <p className="empty">Showing the first 200. Refine your search to see more.</p>}
    </>
  )
}

function ExerciseForm({ exercise, onClose }: { exercise: Exercise | null; onClose: () => void }) {
  const [name, setName] = useState(exercise?.name ?? '')
  const [logType, setLogType] = useState<LogType>(exercise?.logType ?? 'weight_reps')
  const [primary, setPrimary] = useState<Muscle[]>(exercise?.primaryMuscles ?? [])
  const [secondary, setSecondary] = useState<Muscle[]>(exercise?.secondaryMuscles ?? [])
  const isNew = exercise === null
  const canRename = isNew || exercise.custom

  const toggle = (list: Muscle[], set: (m: Muscle[]) => void, m: Muscle) =>
    set(list.includes(m) ? list.filter((x) => x !== m) : [...list, m])

  const save = async () => {
    const trimmed = name.trim()
    if (!trimmed || primary.length === 0) return
    await db.exercises.put({
      id: exercise?.id ?? `custom-${crypto.randomUUID()}`,
      name: trimmed,
      logType,
      primaryMuscles: primary,
      secondaryMuscles: secondary.filter((m) => !primary.includes(m)),
      equipment: exercise?.equipment ?? 'other',
      category: exercise?.category ?? 'strength',
      custom: exercise?.custom ?? true,
    })
    onClose()
  }

  const remove = async () => {
    if (exercise?.custom) {
      await db.exercises.delete(exercise.id)
      onClose()
    }
  }

  return (
    <>
      <PageHeader title={isNew ? 'New exercise' : exercise.name} onBack={onClose} />
      <section className="card">
        <label className="field">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} disabled={!canRename} placeholder="e.g. Dead Hang" />
        </label>

        <label className="field">
          How do you log it?
          <select value={logType} onChange={(e) => setLogType(e.target.value as LogType)}>
            {(Object.keys(LOG_TYPE_LABELS) as LogType[]).map((t) => (
              <option key={t} value={t}>{LOG_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend>Primary muscles (required)</legend>
          <div className="chips">
            {MUSCLES.map((m) => (
              <button type="button" key={m} className={primary.includes(m) ? 'chip on' : 'chip'} onClick={() => toggle(primary, setPrimary, m)}>{cap(m)}</button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Secondary muscles</legend>
          <div className="chips">
            {MUSCLES.filter((m) => !primary.includes(m)).map((m) => (
              <button type="button" key={m} className={secondary.includes(m) ? 'chip on' : 'chip'} onClick={() => toggle(secondary, setSecondary, m)}>{cap(m)}</button>
            ))}
          </div>
        </fieldset>
      </section>

      <div className="btn-row">
        <button className="btn" onClick={save} disabled={!name.trim() || primary.length === 0}>Save</button>
        {exercise?.custom && <button className="btn danger" style={{ flex: 'none', width: 'auto' }} onClick={remove}>Delete</button>}
      </div>
    </>
  )
}
