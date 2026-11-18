import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { plural } from '../lib/format'
import { useProfile } from '../profileContext'
import { ACCENTS, loadAppearance } from '../lib/theme'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import Library from './Library'
import AppearanceScreen from './Appearance'
import RegimeScreen from './Regime'
import { regimeGoals } from '../db/routines'

export type ProfileView = 'main' | 'library' | 'appearance' | 'regime'

/** The current sub-view is owned by App so other tabs can deep-link (e.g. Today → regime). */
export default function ProfileScreen({ view, onView }: { view: ProfileView; onView: (v: ProfileView) => void }) {
  const open = (v: ProfileView) => {
    onView(v)
    window.scrollTo(0, 0)
  }
  const back = () => open('main')
  if (view === 'library') return <Library onBack={back} />
  if (view === 'appearance') return <AppearanceScreen onBack={back} />
  if (view === 'regime') return <RegimeScreen onBack={back} />
  return <ProfileMain onOpen={open} />
}

function ProfileMain({ onOpen }: { onOpen: (v: ProfileView) => void }) {
  const { profiles, active, setActiveId } = useProfile()
  const routineCount = useLiveQuery(() => (active ? db.routines.where('profileId').equals(active.id).count() : 0), [active?.id], 0)
  const { weeklyGoal } = regimeGoals(active, routineCount)
  const [newName, setNewName] = useState('')
  const appearance = loadAppearance()
  const accentLabel = ACCENTS.find((a) => a.id === appearance.accent)?.label
  const themeLabel = appearance.theme.charAt(0).toUpperCase() + appearance.theme.slice(1)

  const add = async () => {
    const name = newName.trim()
    if (!name) return
    const id = await db.profiles.add({ name } as never)
    setNewName('')
    setActiveId(id as number)
  }

  return (
    <>
      <PageHeader eyebrow="Profile" title={active?.name ?? ''} />

      <h2 className="section">Training</h2>
      <div className="group">
        <button className="group-row" onClick={() => onOpen('regime')}>
          <span className="row-icon"><Icon name="calendar" size={20} /></span>
          <span className="two-line">
            <span className="name">Regime</span>
            <span className="sub">
              {routineCount > 0
                ? `${plural(routineCount, 'workout')} · goal ${weeklyGoal} a week`
                : 'Preset workouts and a weekly goal'}
            </span>
          </span>
          <span className="chev"><Icon name="chevronRight" size={20} /></span>
        </button>
        <button className="group-row" onClick={() => onOpen('library')}>
          <span className="row-icon"><Icon name="dumbbell" size={20} /></span>
          <span className="grow">Exercise library</span>
          <span className="chev"><Icon name="chevronRight" size={20} /></span>
        </button>
      </div>

      <h2 className="section">Body & baseline</h2>
      <div className="group">
        <div className="group-row">
          <span className="row-icon"><Icon name="body" size={20} /></span>
          <span className="two-line">
            <span className="name">Body metrics</span>
            <span className="sub">Age, height, bodyweight, relative strength</span>
          </span>
          <span className="badge">Soon</span>
        </div>
      </div>

      <h2 className="section">Profiles</h2>
      <div className="group">
        {profiles.map((p) => (
          <div className="group-row" key={p.id}>
            <span className="avatar sm">{p.name.charAt(0).toUpperCase()}</span>
            <input
              className="bare"
              defaultValue={p.name}
              aria-label={`Rename ${p.name}`}
              onBlur={(e) => {
                const v = e.target.value.trim()
                if (v && v !== p.name) db.profiles.update(p.id, { name: v })
                else e.target.value = p.name
              }}
            />
            {p.id === active?.id ? (
              <span className="badge on">Active</span>
            ) : (
              <button className="btn-text" onClick={() => setActiveId(p.id)}>Use</button>
            )}
          </div>
        ))}
        <div className="group-row">
          <input className="bare" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Add profile" aria-label="New profile name" />
          <button className="btn-text" onClick={add} disabled={!newName.trim()}>Add</button>
        </div>
      </div>

      <h2 className="section">App</h2>
      <div className="group">
        <button className="group-row" onClick={() => onOpen('appearance')}>
          <span className="row-icon"><Icon name="palette" size={20} /></span>
          <span className="grow">Appearance</span>
          <span className="meta">{themeLabel} · {accentLabel}</span>
          <span className="chev"><Icon name="chevronRight" size={20} /></span>
        </button>
      </div>
    </>
  )
}
