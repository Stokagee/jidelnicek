// Edit/delete-dish route (§14.5, FR-D5, BR-5/BR-7). The dish is read from the
// current week's active list (there is no GET /dishes/{id}); not-found or a
// non-editor is sent home. Delete is soft on the server; here it returns home
// (full list reflection comes with the dish list in T-7.3).
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import type { Week } from '../api/types'
import { deleteDish, updateDish } from '../api/dishes'
import { getCurrentWeek } from '../api/weeks'
import { useAuth } from '../auth/useAuth'
import { canEdit } from '../domain/dishBlock'
import { cs } from '../i18n/cs'
import { DishForm, type DishFormValues } from './DishForm'
import { dishErrorMessage } from './dishErrors'
import { validateDishForm } from './validateDishForm'
import { weekRange } from './weekRange'

export function EditDish() {
  const { dishId } = useParams<{ dishId: string }>()
  const navigate = useNavigate()
  const { me } = useAuth()
  const [week, setWeek] = useState<Week | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    getCurrentWeek()
      .then(setWeek)
      .catch(() => setWeek(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <p className="auth-loading" data-testid="dish-loading">
        {cs.common.loading}
      </p>
    )
  }

  const id = Number(dishId)
  const dish = week?.dishes.find((d) => d.id === id) ?? null
  if (!dish || !canEdit(me, dish)) {
    return <Navigate to="/" replace />
  }

  const { min, max } = weekRange(week!.start_date)
  const todayPrague = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Prague' }).format(
    new Date(),
  )

  async function onSubmit(values: DishFormValues) {
    setError(null)
    const validationError = validateDishForm(values) // #79: required fields before PATCH.
    if (validationError) {
      setError(validationError)
      return
    }
    setSubmitting(true)
    try {
      await updateDish(id, values)
      navigate('/', { replace: true })
    } catch (err) {
      setError(dishErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function onDelete() {
    setError(null)
    setDeleting(true)
    try {
      await deleteDish(id)
      navigate('/', { replace: true })
    } catch (err) {
      setError(dishErrorMessage(err))
      setDeleting(false)
    }
  }

  return (
    <DishForm
      title={cs.dish.editTitle}
      initial={{ name: dish.name, start_date: dish.start_date, end_date: dish.end_date }}
      startIso={todayPrague}
      minDate={min}
      maxDate={max}
      error={error}
      submitting={submitting}
      onSubmit={onSubmit}
      onDelete={onDelete}
      deleting={deleting}
      onBack={() => navigate(-1)}
    />
  )
}
