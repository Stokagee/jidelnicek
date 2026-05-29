// Visual week-grid range picker for dish block (start_date → end_date).
// Click once to set the start, click again (on same day or later) to set the
// end. Clicking when both are set resets the selection.
// Hidden <input type="date"> elements with data-testid are kept for tests.
import { cs } from '../i18n/cs'

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  return dt.toISOString().slice(0, 10)
}

interface Props {
  weekStart: string
  startDate: string
  endDate: string
  onStartChange: (d: string) => void
  onEndChange: (d: string) => void
}

export function BlockPicker({ weekStart, startDate, endDate, onStartChange, onEndChange }: Props) {
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  function handleClick(day: string) {
    if (!startDate || (startDate && endDate)) {
      // No selection or both set → reset, pick new start
      onStartChange(day)
      onEndChange('')
    } else {
      // Start set, no end
      if (day >= startDate) {
        onEndChange(day)
      } else {
        // Clicked before start → shift start
        onStartChange(day)
        onEndChange('')
      }
    }
  }

  function dayClass(day: string) {
    const isStart = day === startDate
    const isEnd = day === endDate
    const inRange = startDate && endDate && day > startDate && day < endDate
    if (isStart || isEnd) return 'wc-day bp-selected'
    if (inRange) return 'wc-day bp-range'
    return 'wc-day'
  }

  return (
    <div className="block-picker">
      <div className="week-calendar" role="group" aria-label={cs.dish.blockPickerLabel}>
        {cs.days.short.map((label) => (
          <span key={label} className="wc-header">
            {label}
          </span>
        ))}
        {weekDays.map((day) => (
          <button
            key={day}
            type="button"
            className={dayClass(day)}
            aria-pressed={day === startDate || day === endDate}
            onClick={() => handleClick(day)}
          >
            {day.slice(8)}
          </button>
        ))}
      </div>
      {startDate && (
        <p className="block-picker-summary">
          {cs.dish.blockFrom} <strong>{startDate}</strong>
          {endDate && (
            <>
              {' '}{cs.dish.blockTo} <strong>{endDate}</strong>
            </>
          )}
        </p>
      )}
      {/* Hidden inputs keep testids for existing tests (fireEvent.change still works). */}
      <input
        data-testid="dish-start-date"
        type="date"
        className="sr-only"
        value={startDate}
        onChange={(e) => onStartChange(e.target.value)}
        tabIndex={-1}
        aria-hidden="true"
      />
      <input
        data-testid="dish-end-date"
        type="date"
        className="sr-only"
        value={endDate}
        onChange={(e) => onEndChange(e.target.value)}
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  )
}
