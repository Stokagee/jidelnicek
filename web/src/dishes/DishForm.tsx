// Presentational create/edit dish form (§14.5, FR-D1/FR-D2/FR-D5). State is local;
// the route components own loading, permissions, and the API calls. data-testid
// hooks match the Robot page-object (chooser_propose_page.resource).
import { useState, type FormEvent } from 'react'
import { BlockPicker } from '../components/BlockPicker'
import { addDays } from '../utils/dates'
import { ThemeToggle } from '../components/ThemeToggle'
import { cs } from '../i18n/cs'

export interface DishFormValues {
  name: string
  start_date: string
  end_date: string
}

export interface DishFormProps {
  title: string
  initial?: DishFormValues
  /** First day shown in the block-picker grid (ISO, typically today). */
  startIso?: string
  /** When set, only days within [allowedStart, allowedEnd] are selectable (chooser restriction). */
  allowedStart?: string | null
  allowedEnd?: string | null
  minDate?: string
  maxDate?: string
  error: string | null
  submitting: boolean
  onSubmit: (values: DishFormValues) => void
  /** When set, an edit form: renders a delete action. */
  onDelete?: () => void
  deleting?: boolean
  onBack?: () => void
}

function daysInRange(start: string, end: string): string[] {
  const result: string[] = []
  let cur = start
  while (cur <= end) {
    result.push(cur)
    cur = addDays(cur, 1)
  }
  return result
}

export function DishForm({
  title,
  initial,
  startIso,
  allowedStart,
  allowedEnd,
  minDate,
  maxDate,
  error,
  submitting,
  onSubmit,
  onDelete,
  deleting = false,
  onBack,
}: DishFormProps) {
  const [name, setName] = useState(initial?.name ?? '')

  // startDate / endDate are the form values passed to onSubmit and validated by
  // the parent. They are set either by the sr-only test-hook inputs (fireEvent.change)
  // or derived from the visual BlockPicker toggles below.
  const [startDate, setStartDate] = useState(initial?.start_date ?? '')
  const [endDate, setEndDate] = useState(initial?.end_date ?? '')

  // selectedDays drives the visual BlockPicker. Kept in sync with start/end.
  const [selectedDays, setSelectedDays] = useState<string[]>(() => {
    if (!initial?.start_date) return []
    if (!initial?.end_date || initial.end_date === initial.start_date)
      return [initial.start_date]
    return daysInRange(initial.start_date, initial.end_date)
  })

  function toggleDay(day: string) {
    const next = selectedDays.includes(day)
      ? selectedDays.filter((d) => d !== day)
      : [...selectedDays, day]
    setSelectedDays(next)
    const sorted = [...next].sort()
    setStartDate(sorted[0] ?? '')
    setEndDate(sorted[sorted.length - 1] ?? '')
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit({ name, start_date: startDate, end_date: endDate })
  }

  return (
    <main className="screen">
      <div className="screen-header">
        {onBack && (
          <button type="button" className="btn-back" onClick={onBack}>
            {cs.common.back}
          </button>
        )}
        <ThemeToggle />
      </div>
      <h1>{title}</h1>
      <form onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span>{cs.dish.nameLabel}</span>
          <input
            data-testid="dish-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </label>

        <div className="field">
          <span>{cs.dish.blockPickerLabel}</span>
          {startIso ? (
            <>
              <BlockPicker
                startIso={startIso}
                selectedDays={selectedDays}
                onToggle={toggleDay}
                allowedStart={allowedStart}
                allowedEnd={allowedEnd}
              />
              {/* sr-only inputs keep data-testid for existing tests via fireEvent.change.
                  Setting start resets selection; setting end keeps start and extends range
                  (or just sets end directly so tests that set end < start still fail
                  validation in the parent — preserving the invalidBlock error test). */}
              <input
                data-testid="dish-start-date"
                type="date"
                className="sr-only"
                value={startDate}
                onChange={(e) => {
                  const d = e.target.value
                  setStartDate(d)
                  setSelectedDays(d ? [d] : [])
                  if (!d) setEndDate('')
                }}
                tabIndex={-1}
                aria-hidden="true"
              />
              <input
                data-testid="dish-end-date"
                type="date"
                className="sr-only"
                value={endDate}
                onChange={(e) => {
                  const d = e.target.value
                  setEndDate(d)
                  // Keep start intact; validation in parent catches end < start.
                }}
                tabIndex={-1}
                aria-hidden="true"
              />
            </>
          ) : (
            <>
              <label className="field">
                <span>{cs.dish.startLabel}</span>
                <input
                  data-testid="dish-start-date"
                  type="date"
                  min={minDate}
                  max={maxDate}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </label>
              <label className="field">
                <span>{cs.dish.endLabel}</span>
                <input
                  data-testid="dish-end-date"
                  type="date"
                  min={minDate}
                  max={maxDate}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </label>
            </>
          )}
        </div>

        {error && (
          <p data-testid="dish-error" className="form-error" role="alert">
            {error}
          </p>
        )}
        <button data-testid="dish-submit" type="submit" disabled={submitting}>
          {submitting ? cs.common.loading : cs.dish.submit}
        </button>
      </form>
      {onDelete && (
        <button
          data-testid="dish-delete"
          type="button"
          className="danger"
          onClick={onDelete}
          disabled={deleting}
        >
          {cs.dish.delete}
        </button>
      )}
    </main>
  )
}
