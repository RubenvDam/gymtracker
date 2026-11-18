import { useEffect, useState } from 'react'
import { ProfileProvider } from './profile'
import { useProfile } from './profileContext'
import { seedExercises } from './db/db'
import Library from './screens/Library'
import WorkoutScreen from './screens/Workout'
import Profiles from './screens/Profiles'

type Tab = 'workout' | 'library' | 'profiles'

function Shell() {
  const { profiles, active, setActiveId } = useProfile()
  const [tab, setTab] = useState<Tab>('workout')
  const [seedError, setSeedError] = useState<string | null>(null)

  useEffect(() => {
    seedExercises().catch((e) => setSeedError(String(e.message ?? e)))
  }, [])

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
        {seedError && <p className="error">{seedError}. Connect to the internet once to load the exercise library.</p>}
        {tab === 'workout' && <WorkoutScreen />}
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
