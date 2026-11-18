export type ThemePref = 'light' | 'dark' | 'system'
export type Accent = 'electric' | 'volt' | 'ember' | 'aurora'

export interface Appearance {
  theme: ThemePref
  accent: Accent
}

export const DEFAULT_APPEARANCE: Appearance = { theme: 'light', accent: 'aurora' }

export const ACCENTS: { id: Accent; label: string; swatch: string; desc: string }[] = [
  { id: 'aurora', label: 'Aurora', swatch: 'linear-gradient(135deg,#7b3cff,#e83e8c)', desc: 'Playful, premium' },
  { id: 'electric', label: 'Electric', swatch: '#2f5bff', desc: 'Calm, crisp' },
  { id: 'volt', label: 'Volt', swatch: '#c8ff2e', desc: 'Sporty, loud' },
  { id: 'ember', label: 'Ember', swatch: '#ff5a1f', desc: 'Warm, energetic' },
]

// Keep in sync with the inline pre-paint script in index.html.
const KEY = 'gymtracker.appearance'
const BG = { light: '#f2f2f5', dark: '#000000' }

export function loadAppearance(): Appearance {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Appearance>
    return { ...DEFAULT_APPEARANCE, ...raw }
  } catch {
    return DEFAULT_APPEARANCE
  }
}

export function saveAppearance(a: Appearance) {
  try {
    localStorage.setItem(KEY, JSON.stringify(a))
  } catch {
    /* not persisted, still applied for this session */
  }
}

export function applyAppearance(a: Appearance) {
  const dark = a.theme === 'dark' || (a.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  const root = document.documentElement
  root.dataset.theme = dark ? 'dark' : 'light'
  root.dataset.accent = a.accent
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? BG.dark : BG.light)
}
