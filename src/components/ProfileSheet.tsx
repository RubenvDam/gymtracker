import { useProfile } from '../profileContext'
import Icon from './Icon'

/** Bottom sheet for switching who is logging. */
export default function ProfileSheet({ onClose }: { onClose: () => void }) {
  const { profiles, active, setActiveId } = useProfile()
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="Switch profile" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        <h2 className="sheet-title">Who's training?</h2>
        <div className="group">
          {profiles.map((p) => (
            <button
              key={p.id}
              className="group-row"
              onClick={() => {
                setActiveId(p.id)
                onClose()
              }}
            >
              <span className="avatar sm">{p.name.charAt(0).toUpperCase()}</span>
              <span className="grow">{p.name}</span>
              {p.id === active?.id && <span className="accent-text"><Icon name="check" /></span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
