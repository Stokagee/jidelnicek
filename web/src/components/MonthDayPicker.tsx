// Month grid for picking a single day within the 30-day planning window (#80).
// Presentational/controlled: the parent owns the selected day. Days outside
// [windowStart, windowEnd] render as inert cells; in-window days are buttons.
import { useEffect, useRef } from 'react'
import { cs } from '../i18n/cs'
import { addDays, mondayOf } from '../utils/dates'

interface Props {
  /** First selectable day (inclusive, ISO) — typically Europe/Prague today. */
  windowStart: string
  /** Last selectable day (inclusive, ISO) — typically today + 30. */
  windowEnd: string
  selected: string | null
  onSelect: (day: string) => void
}

export function MonthDayPicker({ windowStart, windowEnd, selected, onSelect }: Props) {
  // Whole calendar weeks (Mon-aligned) covering the window, so columns line up.
  const days: string[] = []
  const gridEnd = addDays(mondayOf(windowEnd), 6)
  for (let d = mondayOf(windowStart); d <= gridEnd; d = addDays(d, 1)) days.push(d)

  // #1: scroll the selected day into view on open / when it changes, so the user
  // lands on it without hunting (scrollIntoView is a no-op under jsdom).
  const selectedRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    selectedRef.current?.scrollIntoView?.({ block: 'center' })
  }, [selected])

  return (
    <div className="month-grid" role="group" aria-label={cs.dish.pickDayLabel}>
      {cs.days.short.map((d) => (
        <span key={`h-${d}`} className="wc-header">
          {d}
        </span>
      ))}
      {days.map((day) => {
        const inWindow = day >= windowStart && day <= windowEnd
        const isSelected = day === selected
        let cls = 'month-day'
        if (!inWindow) cls += ' month-day--out'
        if (isSelected) cls += ' month-day--selected'
        if (!inWindow) {
          return (
            <span key={day} className={cls}>
              {Number(day.slice(8))}
            </span>
          )
        }
        return (
          <button
            key={day}
            ref={isSelected ? selectedRef : undefined}
            type="button"
            className={cls}
            data-testid={`pick-day-${day}`}
            aria-pressed={isSelected}
            onClick={() => onSelect(day)}
          >
            {Number(day.slice(8))}
          </button>
        )
      })}
    </div>
  )
}
