import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { createEmptyMonthlyMinutes } from '../lib/calculations'
import { MONTHS, type MonthKey } from '../lib/months'
import type { MonthlyMinutes } from '../lib/types'
import { MonthlyBreakdown } from './MonthlyBreakdown'

function makeTotals(overrides: Partial<MonthlyMinutes> = {}): MonthlyMinutes {
  return { ...createEmptyMonthlyMinutes(), jan: 120, apr: 40, dec: 7, ...overrides }
}

describe('MonthlyBreakdown line chart', () => {
  it('exposes one selectable point per month with a value label', () => {
    render(
      <MonthlyBreakdown
        totals={makeTotals()}
        selectedMonth="jan"
        onSelect={() => undefined}
      />,
    )

    const chart = screen.getByRole('group', {
      name: 'Monthly late-minute totals',
    })
    const points = within(chart).getAllByRole('button')

    expect(points).toHaveLength(MONTHS.length)
    expect(
      within(chart).getByRole('button', { name: 'January: 120 late minutes' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      within(chart).getByRole('button', { name: 'April: 40 late minutes' }),
    ).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps a single tab stop and moves selection with arrow keys', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const { rerender } = render(
      <MonthlyBreakdown
        totals={makeTotals()}
        selectedMonth="jan"
        onSelect={onSelect}
      />,
    )

    const chart = screen.getByRole('group')
    const tabbable = within(chart)
      .getAllByRole('button')
      .filter((button) => button.tabIndex === 0)

    expect(tabbable).toHaveLength(1)

    tabbable[0].focus()
    expect(tabbable[0]).toHaveFocus()

    await user.keyboard('{ArrowRight}')
    expect(onSelect).toHaveBeenLastCalledWith('feb')

    rerender(
      <MonthlyBreakdown
        totals={makeTotals()}
        selectedMonth="feb"
        onSelect={onSelect}
      />,
    )
    await user.keyboard('{End}')
    expect(onSelect).toHaveBeenLastCalledWith('dec')

    rerender(
      <MonthlyBreakdown
        totals={makeTotals()}
        selectedMonth="dec"
        onSelect={onSelect}
      />,
    )
    await user.keyboard('{Home}')
    expect(onSelect).toHaveBeenLastCalledWith('jan')
  })

  it('selects a month when its point is clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(
      <MonthlyBreakdown
        totals={makeTotals()}
        selectedMonth="jan"
        onSelect={onSelect}
      />,
    )

    await user.click(
      within(screen.getByRole('group')).getByRole('button', {
        name: 'April: 40 late minutes',
      }),
    )

    expect(onSelect).toHaveBeenCalledWith('apr')
  })

  it('keeps the parent selection in sync through the chart', async () => {
    const user = userEvent.setup()

    function Harness() {
      const [month, setMonth] = useState<MonthKey>('jan')
      return (
        <>
          <output data-testid="month">{month}</output>
          <MonthlyBreakdown
            totals={makeTotals()}
            selectedMonth={month}
            onSelect={setMonth}
          />
        </>
      )
    }

    render(<Harness />)

    await user.click(
      within(screen.getByRole('group')).getByRole('button', {
        name: 'December: 7 late minutes',
      }),
    )

    expect(screen.getByTestId('month')).toHaveTextContent('dec')
    expect(
      within(screen.getByRole('group')).getByRole('button', {
        name: 'December: 7 late minutes',
      }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('draws a valid flat chart and no point markers when nothing was late', () => {
    const { container } = render(
      <MonthlyBreakdown
        totals={createEmptyMonthlyMinutes()}
        selectedMonth="mar"
        onSelect={() => undefined}
      />,
    )

    const line = container.querySelector('.month-chart__line')
    const area = container.querySelector('.month-chart__area')

    expect(line?.getAttribute('d')).not.toMatch(/NaN|Infinity/)
    expect(area?.getAttribute('d')).not.toMatch(/NaN|Infinity/)
    expect(container.querySelectorAll('.month-chart__dot')).toHaveLength(0)
    expect(container.querySelectorAll('.month-chart__marker')).toHaveLength(1)
  })

  it('publishes every month value in a screen-reader table', () => {
    render(
      <MonthlyBreakdown
        totals={makeTotals()}
        selectedMonth="jan"
        onSelect={() => undefined}
        label="Team monthly totals"
      />,
    )

    const table = screen.getByRole('table', { name: 'Team monthly totals' })
    const rows = within(table).getAllByRole('row')

    expect(rows).toHaveLength(MONTHS.length + 1)
    expect(within(table).getByRole('rowheader', { name: 'April' })).toBeVisible()
    expect(
      within(table).getByRole('rowheader', { name: 'April' }).closest('tr'),
    ).toHaveTextContent('40')
  })
})
