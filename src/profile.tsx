import { useEffect, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, ensureDefaultProfiles, type Profile } from './db/db'
import { ProfileContext } from './profileContext'

const KEY = 'gymtracker.activeProfile'

function readStored(): number | null {
  try {
    const v = localStorage.getItem(KEY)
    return v ? Number(v) : null
  } catch {
    return null
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [activeId, setId] = useState<number | null>(readStored)
  const profiles = useLiveQuery(() => db.profiles.toArray(), [], [] as Profile[])

  useEffect(() => {
    ensureDefaultProfiles().then(() => setReady(true))
  }, [])

  const active = profiles.find((p) => p.id === activeId) ?? profiles[0]

  const setActiveId = (id: number) => {
    setId(id)
    try {
      localStorage.setItem(KEY, String(id))
    } catch {
      /* storage unavailable: selection just won't persist */
    }
  }

  if (!ready) return null
  return <ProfileContext value={{ profiles, active, setActiveId }}>{children}</ProfileContext>
}
