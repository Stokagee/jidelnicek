// Mini week-grid for picking dish-block days. Starts from startIso (typically
// max(today, blockStart) so past days are skipped). Days inside the block render
// as toggle buttons (data-testid="day-YYYY-MM-DD"); days outside the block render
// as blank spacer cells with no testid, keeping existing absence-tests passing.
import { cs } from '../i18n/cs'
import { addDays } from '../utils/dates'

function dayAbbr(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return cs.days.short[(dt.getUTCDay() + 6) % 7] // Mon=0 … Sun=6
}

interface Props {
  /** First day shown in the grid — use min(today, blockStart) so block is always visible. */
  startIso: string
  blockStart: string
  blockEnd: string
  selected: string[]
  onToggle: (day: string) => void
}

export function WeekCalendar({ startIso, blockStart, blockEnd, selected, onToggle }: Props) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(startIso, i))

  return (
    <div className="week-calendar" role="group" aria-label={cs.signup.pickDay}>
      {days.map((day) => (
        <span key={`h-${day}`} className="wc-header">
          {dayAbbr(day)}
        </span>
      ))}
      {days.map((day) => {
        const inBlock = day >= blockStart && day <= blockEnd
        const isSelected = selected.includes(day)

        if (!inBlock) {
          return <span key={day} className="wc-day wc-day--out" aria-hidden="true" />
        }

        return (
          <button
            key={day}
            type="button"
            data-testid={`day-${day}`}
            className={`wc-day${isSelected ? ' selected' : ''}`}
            aria-pressed={isSelected}
            onClick={() => onToggle(day)}
          >
            {day.slice(8)}
          </button>
        )
      })}
    </div>
  )
}
