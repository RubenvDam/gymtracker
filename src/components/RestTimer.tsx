import { useEffect, useRef } from 'react'
import { beep } from '../lib/beep'
import { fmtClock } from '../lib/format'
import { useNow } from '../lib/hooks'

interface Props {
  endsAt: number
  onChange: (endsAt: number | null) => void
}

/**
 * Floating countdown. Mount it only while a timer is running so its clock starts fresh.
 * Uses an end timestamp, so it stays correct if the app was in the background.
 */
export default function RestTimer({ endsAt, onChange }: Props) {
  const now = useNow(250)
  const beeped = useRef<number | null>(null)

  const remaining = Math.ceil((endsAt - now) / 1000)
  const over = remaining <= 0

  useEffect(() => {
    if (over && beeped.current !== endsAt) {
      beeped.current = endsAt
      beep()
    }
  }, [endsAt, over])

  useEffect(() => {
    if (now > endsAt + 8000) onChange(null)
  }, [now, endsAt, onChange])

  // Adding time after the timer ran out restarts it from now.
  const add15 = () => onChange((over ? Date.now() : endsAt) + 15000)
  const sub15 = () => onChange(endsAt - 15000)

  return (
    <div className={over ? 'rest over' : 'rest'} role="timer" aria-live="off">
      <button onClick={sub15} aria-label="Subtract 15 seconds">−15</button>
      <strong>{over ? 'Go!' : fmtClock(remaining)}</strong>
      <button onClick={add15} aria-label="Add 15 seconds">+15</button>
      <button onClick={() => onChange(null)}>Skip</button>
    </div>
  )
}
