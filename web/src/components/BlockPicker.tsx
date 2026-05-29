// Visual day-picker for dish block selection. Shows 7 days from `startIso`
// with dynamic day-of-week headers; each day toggles independently so the user
// can pick 1–7 days freely. The parent manages selectedDays state; this
// component is purely presentational (controlled).
import { cs } from '../i18n/cs'
import { addDays } from '../utils/dates'

function dayAbbr(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  const moIndex = (dt.getUTCDay() + 6) % 7 // Mon=0 … Sun=6
  return cs.days.short[moIndex]
}

interface Props {
  /** First day shown in the grid (ISO). Typically today. */
  startIso: string
  selectedDays: string[]
  onToggle: (day: string) => void
}

export function BlockPicker({ startIso, selectedDays, onToggle }: Props) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(startIso, i))
  const sorted = [...selectedDays].sort()
  const min = sorted[0] ?? ''
  const max = sorted[sorted.length - 1] ?? ''

  return (
    <div className="block-picker">
      <div className="week-calendar" role="group" aria-label={cs.dish.blockPickerLabel}>
        {days.map((day) => (
          <span key={`h-${day}`} className="wc-header">
            {dayAbbr(day)}
          </span>
        ))}
        {days.map((day) => {
          const isSelected = selectedDays.includes(day)
          const inRange = min && max && day > min && day < max
          let cls = 'wc-day'
          if (isSelected) cls += ' bp-selected'
          else if (inRange) cls += ' bp-range'
          return (
            <button
              key={day}
              type="button"
              className={cls}
              aria-pressed={isSelected}
              onClick={() => onToggle(day)}
            >
              {day.slice(8)}
            </button>
          )
        })}
      </div>
      {selectedDays.length > 0 && (
        <p className="block-picker-summary">
          {cs.dish.blockFrom} <strong>{min}</strong>
          {max !== min && (
            <>
              {' '}
              {cs.dish.blockTo} <strong>{max}</strong>
            </>
          )}
        </p>
      )}
    </div>
  )
}
