// Mini week-grid for picking dish-block days. Days inside the block render as
// toggle buttons (data-testid="day-YYYY-MM-DD"); days outside the block render
// as blank spacer cells with no testid, so existing tests that assert absence
// of out-of-block days still pass.
import { cs } from '../i18n/cs'

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  return dt.toISOString().slice(0, 10)
}

interface Props {
  /** Monday of the current week (ISO). */
  weekStart: string
  blockStart: string
  blockEnd: string
  selected: string[]
  onToggle: (day: string) => void
}

export function WeekCalendar({ weekStart, blockStart, blockEnd, selected, onToggle }: Props) {
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div className="week-calendar" role="group" aria-label={cs.signup.pickDay}>
      {cs.days.short.map((label) => (
        <span key={label} className="wc-header">
          {label}
        </span>
      ))}
      {weekDays.map((day) => {
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
