import { useState } from 'react'
import { useProfile } from '../profileContext'
import Icon from './Icon'
import ProfileSheet from './ProfileSheet'

interface Props {
  title: string
  eyebrow?: string
  onBack?: () => void
}

/** Large-title page header. The avatar shows who is logging and opens the profile switcher. */
export default function PageHeader({ title, eyebrow, onBack }: Props) {
  const { active } = useProfile()
  const [open, setOpen] = useState(false)
  return (
    <header className="page-header">
      <div className="page-header-text">
        {onBack && (
          <button className="back" onClick={onBack}>
            <Icon name="back" size={20} />
            Back
          </button>
        )}
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
      </div>
      <button className="avatar" onClick={() => setOpen(true)} aria-label={`Logging as ${active?.name ?? ''}. Switch profile`}>
        {active?.name.charAt(0).toUpperCase()}
      </button>
      {open && <ProfileSheet onClose={() => setOpen(false)} />}
    </header>
  )
}
