import { useEffect, useState } from 'react'
import { db, ensureDefaultProfiles, type Profile } from './db/db'

export default function App() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [active, setActive] = useState<number | null>(null)

  useEffect(() => {
    ensureDefaultProfiles()
      .then(() => db.profiles.toArray())
      .then((p) => {
        setProfiles(p)
        setActive(p[0]?.id ?? null)
      })
  }, [])

  return (
    <main>
      <h1>Gym Tracker</h1>
      <div className="profiles" role="tablist">
        {profiles.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={p.id === active}
            onClick={() => setActive(p.id)}
          >
            {p.name}
          </button>
        ))}
      </div>
      <p>Setup works. Active profile: {profiles.find((p) => p.id === active)?.name ?? '…'}</p>
    </main>
  )
}
