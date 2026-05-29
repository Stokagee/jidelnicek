// Presentational create/edit dish form (§14.5, FR-D1/FR-D2/FR-D5). State is local;
// the route components own loading, permissions, and the API calls. data-testid
// hooks match the Robot page-object (chooser_propose_page.resource).
import { useState, type FormEvent } from 'react'
import { BlockPicker } from '../components/BlockPicker'
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
  weekStart?: string
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

export function DishForm({
  title,
  initial,
  weekStart,
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
  const [startDate, setStartDate] = useState(initial?.start_date ?? '')
  const [endDate, setEndDate] = useState(initial?.end_date ?? '')

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
          {weekStart ? (
            <BlockPicker
              weekStart={weekStart}
              startDate={startDate}
              endDate={endDate}
              onStartChange={setStartDate}
              onEndChange={setEndDate}
            />
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
