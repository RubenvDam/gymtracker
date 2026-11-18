import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Exercise, type Routine, type RoutineItem } from '../db/db'
import { deleteRoutine, itemDefaults, LABEL_SUGGESTIONS, newKey } from '../db/routines'
import { parseNum } from '../lib/format'
import PageHeader from '../components/PageHeader'
import ExercisePicker from '../components/ExercisePicker'
import Icon from '../components/Icon'

type Picking = { mode: 'add' } | { mode: 'alt'; key: string } | null

/** Edits a routine in local state and autosaves every change. */
export default function RoutineEditor({ initial, onBack }: { initial: Routine; onBack: () => void }) {
  const [r, setR] = useState<Routine>(initial)
  const [picking, setPicking] = useState<Picking>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Autosave: writing to the database is the external effect here.
  useEffect(() => {
    void db.routines.put(r)
  }, [r])

  const idsKey = r.items.map((i) => i.exerciseIds.join(',')).join('|')
  const byId = useLiveQuery(
    async () => {
      const ids = [...new Set(r.items.flatMap((i) => i.exerciseIds))]
      return new Map((await db.exercises.bulkGet(ids)).filter((e): e is Exercise => !!e).map((e) => [e.id, e]))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tracked via idsKey
    [idsKey],
    new Map<string, Exercise>(),
  )

  const setItems = (items: RoutineItem[]) => setR({ ...r, items })
  const patchItem = (key: string, patch: Partial<RoutineItem>) => setItems(r.items.map((i) => (i.key === key ? { ...i, ...patch } : i)))
  const move = (idx: number, dir: -1 | 1) => {
    const items = [...r.items]
    const [it] = items.splice(idx, 1)
    items.splice(idx + dir, 0, it)
    setItems(items)
  }

  if (picking) {
    const altItem = picking.mode === 'alt' ? r.items.find((i) => i.key === picking.key) : undefined
    return (
      <ExercisePicker
        title={picking.mode === 'add' ? 'Add exercise' : 'Add alternative'}
        excludeIds={altItem ? altItem.exerciseIds : r.items.flatMap((i) => i.exerciseIds)}
        onClose={() => setPicking(null)}
        onPick={(e) => {
          if (picking.mode === 'add') {
            setItems([...r.items, { key: newKey(), exerciseIds: [e.id], ...itemDefaults(r.label) }])
          } else if (altItem) {
            patchItem(altItem.key, { exerciseIds: [...altItem.exerciseIds, e.id] })
          }
          setPicking(null)
          window.scrollTo(0, document.body.scrollHeight)
        }}
      />
    )
  }

  return (
    <>
      <PageHeader eyebrow="Routine" title={r.name || 'Untitled'} onBack={onBack} />

      <section className="card">
        <label className="field" style={{ marginTop: 0 }}>
          Name
          <input value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} placeholder="e.g. Upper A" />
        </label>
        <label className="field" style={{ marginBottom: 6 }}>
          Label
          <input value={r.label} onChange={(e) => setR({ ...r, label: e.target.value })} placeholder="e.g. Strength" />
        </label>
        <div className="chips" style={{ marginBottom: 0 }}>
          {LABEL_SUGGESTIONS.map((l) => (
            <button key={l} className={r.label === l ? 'chip on' : 'chip'} onClick={() => setR({ ...r, label: l })}>{l}</button>
          ))}
        </div>
      </section>

      <h2 className="section">Exercises</h2>
      {r.items.length === 0 && <p className="empty">No exercises yet. Add the first one below.</p>}

      {r.items.map((item, idx) => {
        const [main, ...alts] = item.exerciseIds.map((id) => byId.get(id))
        const isDuration = main?.logType === 'duration'
        return (
          <article className="card" key={item.key}>
            <div className="ex-head">
              <div className="grow">
                <h3>{main?.name ?? '…'}</h3>
              </div>
              <div className="icon-actions">
                <button className="icon-btn" aria-label="Move up" disabled={idx === 0} onClick={() => move(idx, -1)}>↑</button>
                <button className="icon-btn" aria-label="Move down" disabled={idx === r.items.length - 1} onClick={() => move(idx, 1)}>↓</button>
                <button className="icon-btn" aria-label={`Remove ${main?.name ?? 'exercise'}`} onClick={() => setItems(r.items.filter((i) => i.key !== item.key))}>
                  <Icon name="close" size={18} />
                </button>
              </div>
            </div>

            <div className="targets">
              <NumField label="Sets" value={item.sets} onChange={(n) => patchItem(item.key, { sets: n })} />
              <NumField label={isDuration ? 'Sec from' : 'Reps from'} value={item.repMin} onChange={(n) => patchItem(item.key, { repMin: n, repMax: Math.max(n, item.repMax) })} />
              <NumField label={isDuration ? 'Sec to' : 'Reps to'} value={item.repMax} onChange={(n) => patchItem(item.key, { repMax: n })} />
            </div>

            <input
              className="note-input"
              value={item.note ?? ''}
              onChange={(e) => patchItem(item.key, { note: e.target.value || undefined })}
              placeholder="Note, e.g. each leg"
              aria-label={`Note for ${main?.name ?? 'exercise'}`}
            />

            <div className="chips" style={{ marginBottom: 0 }}>
              {alts.map((a, i) => a && (
                <span key={a.id} className="chip alt">
                  or {a.name}
                  <button aria-label={`Remove alternative ${a.name}`} onClick={() => patchItem(item.key, { exerciseIds: item.exerciseIds.filter((_, j) => j !== i + 1) })}>
                    <Icon name="close" size={14} />
                  </button>
                </span>
              ))}
              <button className="btn-text" onClick={() => setPicking({ mode: 'alt', key: item.key })}>+ Alternative</button>
            </div>
          </article>
        )
      })}

      <button className="btn secondary" onClick={() => setPicking({ mode: 'add' })}>+ Add exercise</button>

      <div className="btn-row" style={{ marginTop: 28 }}>
        {confirmDelete ? (
          <>
            <button className="btn danger" onClick={async () => { await deleteRoutine(r.id); onBack() }}>Yes, delete routine</button>
            <button className="btn secondary inline" onClick={() => setConfirmDelete(false)}>Cancel</button>
          </>
        ) : (
          <button className="btn-text danger" style={{ width: '100%' }} onClick={() => setConfirmDelete(true)}>Delete routine</button>
        )}
      </div>
    </>
  )
}

/**
 * Small integer input. While focused it keeps partial typing (e.g. empty) without committing it;
 * otherwise it shows the stored value, so changes made elsewhere (min pushing max) appear.
 */
function NumField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const [text, setText] = useState<string | null>(null)
  return (
    <label className="mini">
      <span>{label}</span>
      <input
        inputMode="numeric"
        value={text ?? String(value)}
        onFocus={() => setText(String(value))}
        onChange={(e) => {
          setText(e.target.value)
          const n = parseNum(e.target.value)
          if (n !== undefined && n >= 1) onChange(Math.round(n))
        }}
        onBlur={() => setText(null)}
      />
    </label>
  )
}
