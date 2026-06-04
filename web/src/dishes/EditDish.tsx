// Edit/delete-dish route (§14.5, FR-D5, BR-5/BR-7). The dish is read from the
// current week's active list (there is no GET /dishes/{id}); not-found or a
// non-editor is sent home. Delete is soft on the server; here it returns home
// (full list reflection comes with the dish list in T-7.3).
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import type { DishWithSignups } from '../api/types'
import { deleteDish, getDish, updateDish } from '../api/dishes'
import { useAuth } from '../auth/useAuth'
import { canEdit } from '../domain/dishBlock'
import { cs } from '../i18n/cs'
import { mondayOf } from '../utils/dates'
import { DishForm, type DishFormValues } from './DishForm'
import { dishErrorMessage } from './dishErrors'
import { validateDishForm } from './validateDishForm'
import { weekRange } from './weekRange'

export function EditDish() {
  const { dishId } = useParams<{ dishId: string }>()
  const navigate = useNavigate()
  const { me } = useAuth()
  const id = Number(dishId)
  const [dish, setDish] = useState<DishWithSignups | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    // #80: load the dish by id so a future / cross-week dish is editable too.
    getDish(id)
      .then(setDish)
      .catch(() => setDish(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <p className="auth-loading" data-testid="dish-loading">
        {cs.common.loading}
      </p>
    )
  }

  if (!dish || !canEdit(me, dish)) {
    return <Navigate to="/" replace />
  }

  // Constrain the block picker to the dish's own ISO week.
  const weekMonday = mondayOf(dish.start_date)
  const { min, max } = weekRange(weekMonday)

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
      startIso={weekMonday}
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
