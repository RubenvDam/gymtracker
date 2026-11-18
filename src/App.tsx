import { useEffect, useState } from 'react'
import { ProfileProvider } from './profile'
import { seedExercises } from './db/db'
import { applyAppearance, loadAppearance } from './lib/theme'
import Icon, { type IconName } from './components/Icon'
import Today from './screens/Today'
import WorkoutScreen from './screens/Workout'
import Progress from './screens/Progress'
import ProfileScreen from './screens/Profile'

type Tab = 'today' | 'log' | 'progress' | 'profile'

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'today', label: 'Today', icon: 'today' },
  { id: 'log', label: 'Log', icon: 'log' },
  { id: 'progress', label: 'Progress', icon: 'progress' },
  { id: 'profile', label: 'Profile', icon: 'profile' },
]

function Shell() {
  const [tab, setTab] = useState<Tab>('today')
  const [seedError, setSeedError] = useState<string | null>(null)

  useEffect(() => {
    seedExercises().catch((e) => setSeedError(String(e.message ?? e)))
  }, [])

  // Follow the phone's light/dark switch when the theme is set to "System".
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyAppearance(loadAppearance())
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const go = (t: Tab) => {
    setTab(t)
    window.scrollTo(0, 0)
  }

  return (
    <>
      <div className="statusbar-shim" />
      <main className="page">
        {seedError && <p className="error">{seedError}. Connect to the internet once to load the exercise library.</p>}
        {tab === 'today' && <Today onOpenLog={() => go('log')} onOpenProgress={() => go('progress')} />}
        {tab === 'log' && <WorkoutScreen />}
        {tab === 'progress' && <Progress />}
        {tab === 'profile' && <ProfileScreen />}
      </main>
      <nav className="tabbar" aria-label="Main">
        <div className="tabbar-inner">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'tab on' : 'tab'} aria-current={tab === t.id ? 'page' : undefined} onClick={() => go(t.id)}>
              <Icon name={t.icon} />
              {t.label}
            </button>
          ))}
        </div>
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
