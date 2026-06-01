import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BlockPicker } from './BlockPicker'

// #47: the picker's selection summary shows Czech "D. M." dates, not raw ISO.
describe('BlockPicker summary (#47)', () => {
  it('renders the selected range as a Czech day-month range', () => {
    render(
      <BlockPicker
        startIso="2026-01-05"
        selectedDays={['2026-01-05', '2026-01-07']}
        onToggle={() => {}}
      />,
    )
    expect(screen.getByText('5. 1.')).toBeInTheDocument()
    expect(screen.getByText('7. 1.')).toBeInTheDocument()
    // The raw ISO must not be shown in the summary.
    expect(screen.queryByText('2026-01-05')).not.toBeInTheDocument()
  })
})
