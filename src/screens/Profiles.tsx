import { useState } from 'react'
import { db } from '../db/db'
import { useProfile } from '../profileContext'

export default function Profiles() {
  const { profiles, active, setActiveId } = useProfile()
  const [newName, setNewName] = useState('')

  const add = async () => {
    const name = newName.trim()
    if (!name) return
    const id = (await db.profiles.add({ name } as never)) as number
    setNewName('')
    setActiveId(id)
  }

  return (
    <section>
      <h2>Profiles</h2>
      <p className="muted">Each profile has its own workout history. The exercise library is shared.</p>
      <ul className="list">
        {profiles.map((p) => (
          <li key={p.id} className="row">
            <input
              defaultValue={p.name}
              aria-label={`Rename ${p.name}`}
              onBlur={(e) => {
                const v = e.target.value.trim()
                if (v && v !== p.name) db.profiles.update(p.id, { name: v })
                else e.target.value = p.name
              }}
            />
            <button className={p.id === active?.id ? 'chip on' : 'chip'} onClick={() => setActiveId(p.id)}>
              {p.id === active?.id ? 'Active' : 'Use'}
            </button>
          </li>
        ))}
      </ul>
      <div className="row">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Add profile" />
        <button className="primary" onClick={add} disabled={!newName.trim()}>Add</button>
      </div>
    </section>
  )
}
