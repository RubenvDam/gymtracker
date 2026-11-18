import { useState } from 'react'
import { ProfileProvider } from './profile'
import { useProfile } from './profileContext'
import Library from './screens/Library'
import Profiles from './screens/Profiles'

type Tab = 'workout' | 'library' | 'profiles'

function Shell() {
  const { profiles, active, setActiveId } = useProfile()
  const [tab, setTab] = useState<Tab>('library')

  return (
    <>
      <header>
        <div className="profiles" role="tablist" aria-label="Active profile">
          {profiles.map((p) => (
            <button key={p.id} role="tab" aria-selected={p.id === active?.id} onClick={() => setActiveId(p.id)}>
              {p.name}
            </button>
          ))}
        </div>
      </header>
      <main>
        {tab === 'workout' && <p className="muted">Workout logging comes in milestone 3.</p>}
        {tab === 'library' && <Library />}
        {tab === 'profiles' && <Profiles />}
      </main>
      <nav className="tabbar">
        {(['workout', 'library', 'profiles'] as Tab[]).map((t) => (
          <button key={t} aria-current={tab === t} onClick={() => setTab(t)}>
            {t === 'workout' ? 'Workout' : t === 'library' ? 'Library' : 'Profiles'}
          </button>
        ))}
      </nav>
    </>
  )
}

export default function App() {
  return (
    <ProfileProvider>
      <Shell />
    </ProfileProvider>
  )
}
