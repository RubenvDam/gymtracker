import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, MUSCLES, type Exercise, type Muscle } from '../db/db'
import { cap } from '../lib/format'
import PageHeader from './PageHeader'
import Icon from './Icon'

interface Props {
  excludeIds: string[]
  onPick: (e: Exercise) => void
  onClose: () => void
  title?: string
}

export default function ExercisePicker({ excludeIds, onPick, onClose, title = 'Add exercise' }: Props) {
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<Muscle | null>(null)
  const all = useLiveQuery(() => db.exercises.orderBy('name').toArray(), [], [] as Exercise[])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all.filter(
      (e) => !excludeIds.includes(e.id) && (!q || e.name.toLowerCase().includes(q)) && (!muscle || e.primaryMuscles.includes(muscle)),
    )
  }, [all, query, muscle, excludeIds])

  return (
    <>
      <PageHeader title={title} onBack={onClose} />
      <input type="search" autoFocus placeholder="Search exercises" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search exercises" />
      <div className="chips scroll" role="group" aria-label="Filter by primary muscle">
        <button className={muscle === null ? 'chip on' : 'chip'} onClick={() => setMuscle(null)}>All</button>
        {MUSCLES.map((m) => (
          <button key={m} className={muscle === m ? 'chip on' : 'chip'} onClick={() => setMuscle(muscle === m ? null : m)}>{cap(m)}</button>
        ))}
      </div>
      <div className="group">
        {shown.slice(0, 100).map((e) => (
          <button key={e.id} className="group-row item" onClick={() => onPick(e)}>
            <span className="two-line">
              <span className="name">{e.name}</span>
              <span className="sub">{e.primaryMuscles.map(cap).join(', ') || '—'} · {cap(e.equipment)}</span>
            </span>
            <span className="accent-text"><Icon name="log" size={22} /></span>
          </button>
        ))}
      </div>
      {shown.length > 100 && <p className="empty">Showing the first 100. Refine your search to see more.</p>}
    </>
  )
}
