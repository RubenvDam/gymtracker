import { useState } from 'react'
import { ACCENTS, applyAppearance, loadAppearance, saveAppearance, type Appearance, type ThemePref } from '../lib/theme'
import PageHeader from '../components/PageHeader'

const THEMES: { id: ThemePref; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'System' },
]

export default function AppearanceScreen({ onBack }: { onBack: () => void }) {
  const [a, setA] = useState<Appearance>(loadAppearance)
  const update = (patch: Partial<Appearance>) => {
    const next = { ...a, ...patch }
    setA(next)
    saveAppearance(next)
    applyAppearance(next)
  }

  return (
    <>
      <PageHeader title="Appearance" onBack={onBack} />

      <h2 className="section">Theme</h2>
      <div className="seg" role="group" aria-label="Theme">
        {THEMES.map((t) => (
          <button key={t.id} aria-pressed={a.theme === t.id} onClick={() => update({ theme: t.id })}>{t.label}</button>
        ))}
      </div>

      <h2 className="section">Accent colour</h2>
      <div className="swatches" role="group" aria-label="Accent colour">
        {ACCENTS.map((x) => (
          <button key={x.id} className="swatch-card" aria-pressed={a.accent === x.id} onClick={() => update({ accent: x.id })}>
            <span className="swatch-dot" style={{ background: x.swatch }} />
            <span className="two-line">
              <span>{x.label}</span>
              <span className="sub">{x.desc}</span>
            </span>
          </button>
        ))}
      </div>

      <h2 className="section">Preview</h2>
      <section className="card hero" aria-hidden="true">
        <span className="pill">● Planned · Strength</span>
        <h2>Upper – Strength</h2>
        <p className="sub">5 exercises · ~60 min</p>
        <div className="btn" role="presentation">Start session</div>
      </section>
    </>
  )
}
