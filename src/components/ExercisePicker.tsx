import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, MUSCLES, type Exercise, type Muscle } from '../db/db'
import { cap } from '../lib/format'

interface Props {
  excludeIds: string[]
  onPick: (e: Exercise) => void
  onClose: () => void
}

export default function ExercisePicker({ excludeIds, onPick, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<Muscle | null>(null)
  const all = useLiveQuery(() => db.exercises.orderBy('name').toArray(), [], [] as Exercise[])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all.filter(
      (e) =>
        !excludeIds.includes(e.id) &&
        (!q || e.name.toLowerCase().includes(q)) &&
        (!muscle || e.primaryMuscles.includes(muscle)),
    )
  }, [all, query, muscle, excludeIds])

  return (
    <section>
      <button className="link" onClick={onClose}>← Back to workout</button>
      <h2>Add exercise</h2>
      <input type="search" autoFocus placeholder="Search exercises" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search exercises" />
      <div className="chips scroll" role="group" aria-label="Filter by primary muscle">
        <button className={muscle === null ? 'chip on' : 'chip'} onClick={() => setMuscle(null)}>All</button>
        {MUSCLES.map((m) => (
          <button key={m} className={muscle === m ? 'chip on' : 'chip'} onClick={() => setMuscle(muscle === m ? null : m)}>{cap(m)}</button>
        ))}
      </div>
      <ul className="list">
        {shown.slice(0, 100).map((e) => (
          <li key={e.id}>
            <button className="item" onClick={() => onPick(e)}>
              <span className="name">{e.name}</span>
              <span className="muted">{e.primaryMuscles.map(cap).join(', ') || '—'} · {cap(e.equipment)}</span>
            </button>
          </li>
        ))}
      </ul>
      {shown.length > 100 && <p className="muted">Showing the first 100. Refine your search to see more.</p>}
    </section>
  )
}
