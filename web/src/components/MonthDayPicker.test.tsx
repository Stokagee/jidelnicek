import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MonthDayPicker } from './MonthDayPicker'

describe('MonthDayPicker (#80)', () => {
  it('makes every day in the 30-day window selectable and leaves the rest inert', () => {
    render(
      <MonthDayPicker
        windowStart="2026-01-05"
        windowEnd="2026-02-04"
        selected={null}
        onSelect={() => {}}
      />,
    )
    expect(screen.getByTestId('pick-day-2026-01-05')).toBeInTheDocument()
    expect(screen.getByTestId('pick-day-2026-02-04')).toBeInTheDocument()
    // A day past the window is rendered but not a button (no testid).
    expect(screen.queryByTestId('pick-day-2026-02-05')).not.toBeInTheDocument()
  })

  it('marks the selected day as pressed and reports clicks', async () => {
    const onSelect = vi.fn()
    render(
      <MonthDayPicker
        windowStart="2026-01-05"
        windowEnd="2026-02-04"
        selected="2026-01-10"
        onSelect={onSelect}
      />,
    )
    expect(screen.getByTestId('pick-day-2026-01-10')).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByTestId('pick-day-2026-01-20'))
    expect(onSelect).toHaveBeenCalledWith('2026-01-20')
  })
})
