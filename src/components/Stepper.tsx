import { fmtNum, parseNum } from '../lib/format'

interface Props {
  label: string
  value: string
  onChange: (v: string) => void
  step: number
  min?: number
  decimal?: boolean
  /** "0" suits optional fields; required fields use a dash so an empty field doesn't look filled in. */
  placeholder?: string
}

/** Typed number with − / + buttons. Value stays a string so partial input like "7." is allowed. */
export default function Stepper({ label, value, onChange, step, min = 0, decimal, placeholder = '0' }: Props) {
  const bump = (dir: 1 | -1) => {
    const cur = parseNum(value) ?? 0
    onChange(fmtNum(Math.max(min, Math.round((cur + dir * step) * 100) / 100)))
  }
  return (
    <div className="stepper">
      <span className="slabel">{label}</span>
      <div className="srow">
        <button type="button" aria-label={`Decrease ${label}`} onClick={() => bump(-1)}>−</button>
        <input
          inputMode={decimal ? 'decimal' : 'numeric'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          placeholder={placeholder}
        />
        <button type="button" aria-label={`Increase ${label}`} onClick={() => bump(1)}>+</button>
      </div>
    </div>
  )
}
