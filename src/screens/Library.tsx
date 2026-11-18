import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, seedExercises, MUSCLES, LOG_TYPE_LABELS, type Exercise, type LogType, type Muscle } from '../db/db'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default function Library() {
  const [seedError, setSeedError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<Muscle | null>(null)
  const [editing, setEditing] = useState<Exercise | 'new' | null>(null)

  useEffect(() => {
    seedExercises().catch((e) => setSeedError(String(e.message ?? e)))
  }, [])

  const all = useLiveQuery(() => db.exercises.orderBy('name').toArray(), [], [] as Exercise[])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all.filter(
      (e) =>
        (!q || e.name.toLowerCase().includes(q)) &&
        (!muscle || e.primaryMuscles.includes(muscle)),
    )
  }, [all, query, muscle])

  if (editing) return <ExerciseForm exercise={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />

  return (
    <section>
      <div className="row">
        <input
          type="search"
          placeholder="Search exercises"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search exercises"
        />
        <button className="primary" onClick={() => setEditing('new')}>+ New</button>
      </div>

      <div className="chips scroll" role="group" aria-label="Filter by primary muscle">
        <button className={muscle === null ? 'chip on' : 'chip'} onClick={() => setMuscle(null)}>All</button>
        {MUSCLES.map((m) => (
          <button key={m} className={muscle === m ? 'chip on' : 'chip'} onClick={() => setMuscle(muscle === m ? null : m)}>
            {cap(m)}
          </button>
        ))}
      </div>

      {seedError && <p className="error">{seedError}. Connect to the internet once to load the library.</p>}
      <p className="muted">{shown.length} exercises</p>

      <ul className="list">
        {shown.slice(0, 200).map((e) => (
          <li key={e.id}>
            <button className="item" onClick={() => setEditing(e)}>
              <span className="name">{e.name}{e.custom && <em> · custom</em>}</span>
              <span className="muted">
                {e.primaryMuscles.map(cap).join(', ') || '—'} · {cap(e.equipment)} · {LOG_TYPE_LABELS[e.logType].split(' (')[0]}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {shown.length > 200 && <p className="muted">Showing the first 200. Refine your search to see more.</p>}
    </section>
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
    const row: Exercise = {
      id: exercise?.id ?? `custom-${crypto.randomUUID()}`,
      name: trimmed,
      logType,
      primaryMuscles: primary,
      secondaryMuscles: secondary.filter((m) => !primary.includes(m)),
      equipment: exercise?.equipment ?? 'other',
      category: exercise?.category ?? 'strength',
      custom: exercise?.custom ?? true,
    }
    await db.exercises.put(row)
    onClose()
  }

  const remove = async () => {
    if (exercise?.custom) {
      await db.exercises.delete(exercise.id)
      onClose()
    }
  }

  return (
    <section className="form">
      <button className="link" onClick={onClose}>← Back</button>
      <h2>{isNew ? 'New exercise' : exercise.name}</h2>

      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} disabled={!canRename} placeholder="e.g. Dead Hang" />
      </label>

      <label>
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
            <button type="button" key={m} className={primary.includes(m) ? 'chip on' : 'chip'} onClick={() => toggle(primary, setPrimary, m)}>
              {cap(m)}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Secondary muscles</legend>
        <div className="chips">
          {MUSCLES.filter((m) => !primary.includes(m)).map((m) => (
            <button type="button" key={m} className={secondary.includes(m) ? 'chip on' : 'chip'} onClick={() => toggle(secondary, setSecondary, m)}>
              {cap(m)}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="row">
        <button className="primary" onClick={save} disabled={!name.trim() || primary.length === 0}>Save</button>
        {exercise?.custom && <button className="danger" onClick={remove}>Delete</button>}
      </div>
    </section>
  )
}
