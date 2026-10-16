import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { AUTH_USER_KEY } from './lib/auth'
import { STORAGE_KEY } from './lib/storage'
import type { TrackerData } from './lib/types'

function monthMinutesRow(label: string) {
  const row = screen.getByRole('row', { name: new RegExp(`^${label}`) })

  return within(row).getByRole('cell').textContent
}

function metricText(label: string, index: number) {
  const card = screen.getByText(label).closest('article')

  if (!card) {
    throw new Error(`Metric card "${label}" is missing.`)
  }

  return Array.from(card.querySelectorAll('p'))[index]?.textContent
}

/**
 * Seeds localStorage so the app treats the current session as an authenticated
 * employee (worker role). Does NOT set a token so getActiveRepository() keeps
 * using localStorageRepository in tests — MODE=test already bypasses the auth
 * gate, and we only need getAuthUser() to return an employee-role object.
 */
function setEmployeeAuth() {
  window.localStorage.setItem(
    AUTH_USER_KEY,
    JSON.stringify({
      id: 'emp-1',
      role: 'EMPLOYEE',
      employee: {
        id: 'emp-1',
        employeeCode: 'EMP-0001',
        firstName: 'Test',
        lastName: 'Worker',
      },
    }),
  )
}

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  async function renderApp() {
    render(<App />)
    await waitFor(() =>
      expect(screen.queryByText('Loading attendance records')).toBeNull(),
    )
  }

  async function selectSeptember() {
    await userEvent.setup().selectOptions(
      screen.getByLabelText('Reporting month'),
      'September',
    )
  }

  function dataSourceNotice() {
    return within(screen.getByRole('region', { name: 'Data source' }))
  }

  it('starts on the manager view with demo data', async () => {
    await renderApp()

    expect(
      screen.getByRole('heading', { name: 'Lateness dashboard' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('region', { name: 'Data source' }),
    ).toBeNull()
    // Role is derived from auth, not a manual toggle — the switch no longer exists
    expect(screen.queryByLabelText('View as role')).toBeNull()
    expect(screen.getByRole('button', { name: 'Import Excel' })).toBeVisible()
  })

  it('marks the current records as demo data in the header', async () => {
    await renderApp()

    expect(screen.getByText('Demo data')).toBeInTheDocument()
  })

  it('routes an authenticated employee to the worker view', async () => {
    setEmployeeAuth()
    await renderApp()

    expect(
      screen.getByRole('heading', { level: 1, name: 'My late records' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Import Excel' })).toBeNull()
    expect(screen.queryByLabelText('View as role')).toBeNull()
  })


  it('lists demo workers in the manager table', async () => {
    await renderApp()

    const table = screen.getByRole('table', { name: /worker late-minute totals/i })
    expect(within(table).getAllByRole('row').length).toBeGreaterThan(1)
    expect(within(table).getByText('Avery Reyes')).toBeInTheDocument()
  })

  it('filters workers by search text', async () => {
    const user = userEvent.setup()
    await renderApp()

    await user.type(screen.getByRole('searchbox'), 'Bautista')

    const table = screen.getByRole('table', { name: /worker late-minute totals/i })
    expect(within(table).getByText('Jordan Lee Bautista')).toBeInTheDocument()
    expect(within(table).queryByText('Avery Reyes')).toBeNull()
  })

  it('restores uploaded data from local storage', async () => {
    const stored: TrackerData = {
      version: 1,
      source: 'upload',
      fileName: 'march-report.xlsx',
      sheetName: 'Workers',
      workers: [
        {
          id: 'W-9',
          firstName: 'Sam',
          middleName: '',
          lastName: 'Okafor',
          monthlyMinutes: {
            jan: 0,
            feb: 0,
            mar: 0,
            apr: 0,
            may: 0,
            jun: 0,
            jul: 0,
            aug: 0,
            sep: 0,
            oct: 0,
            nov: 0,
            dec: 45,
          },
        },
      ],
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))

    await renderApp()

    expect(dataSourceNotice().getByText('Imported dataset')).toBeInTheDocument()
    expect(screen.getAllByText(/march-report\.xlsx/).length).toBeGreaterThan(0)
    expect(
      dataSourceNotice().getByRole('button', { name: 'Restore demo' }),
    ).toBeVisible()
  })

  it('reports records synced from a server', async () => {
    const stored: TrackerData = {
      version: 1,
      source: 'server',
      workers: [],
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))

    await renderApp()

    expect(dataSourceNotice().getByText('Live data')).toBeInTheDocument()
    expect(
      dataSourceNotice().getByText('Records are synced from the attendance server.'),
    ).toBeInTheDocument()
  })

  it('opens the import dialog from the manager view', async () => {
    const user = userEvent.setup()
    await renderApp()

    await user.click(screen.getByRole('button', { name: 'Import Excel' }))

    const dialog = screen.getByRole('dialog')
    expect(
      within(dialog).getByRole('heading', { name: 'Import worker totals' }),
    ).toBeInTheDocument()
    expect(within(dialog).getByText('Download template')).toBeInTheDocument()
    expect(within(dialog).getByText('Use sample workbook')).toBeInTheDocument()
  })

  it('closes the import dialog without changing the dataset', async () => {
    const user = userEvent.setup()
    await renderApp()

    await user.click(screen.getByRole('button', { name: 'Import Excel' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(
      screen.getByRole('button', { name: 'Import Excel' }),
    ).toHaveFocus()
    expect(screen.queryByRole('region', { name: 'Data source' })).toBeNull()
  })

  it('opens a worker detail dialog from the view button', async () => {
    const user = userEvent.setup()
    await renderApp()
    await selectSeptember()

    const workerTable = screen.getByRole('table', {
      name: /worker late-minute totals/i,
    })
    await user.click(
      within(workerTable)
        .getAllByRole('button', { name: 'View' })
        .find((button) =>
          button.closest('tr')?.textContent?.includes('Avery Reyes'),
        ) as HTMLElement,
    )

    const dialog = screen.getByRole('dialog')
    expect(
      within(dialog).getByRole('heading', { name: 'Avery Reyes' }),
    ).toBeInTheDocument()
    expect(within(dialog).getByText('DEMO-1001')).toBeInTheDocument()
    expect(within(dialog).getByText(/minutes in the selected month/)).toBeVisible()
    expect(within(dialog).getByText(/12 months/)).toBeVisible()
    expect(
      within(dialog).getByRole('button', { name: 'Close worker details' }),
    ).toBeInTheDocument()
    expect(within(dialog).getByText(/Press Escape to close/)).toBeVisible()
  })

  it('closes the worker detail dialog on the escape key', async () => {
    const user = userEvent.setup()
    await renderApp()

    const viewButton = screen.getAllByRole('button', { name: 'View' })[0]
    await user.click(viewButton)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()

    fireEvent(dialog, new Event('cancel', { cancelable: true }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(viewButton).toHaveFocus()
  })

  it('moves focus into the worker detail dialog when it opens', async () => {
    const user = userEvent.setup()
    await renderApp()

    await user.click(screen.getAllByRole('button', { name: 'View' })[0])

    expect(
      screen.getByRole('button', { name: 'Close worker details' }),
    ).toHaveFocus()
  })

  it('closes the worker detail dialog from the close icon', async () => {
    const user = userEvent.setup()
    await renderApp()

    await user.click(screen.getAllByRole('button', { name: 'View' })[0])
    await user.click(screen.getByRole('button', { name: 'Close worker details' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(
      screen.getByRole('table', { name: /worker late-minute totals/i }),
    ).toBeInTheDocument()
  })

  it('leaves the worker view without a detail dialog', async () => {
    setEmployeeAuth()
    await renderApp()

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(
      screen.getByRole('heading', { level: 1, name: 'My late records' }),
    ).toBeInTheDocument()
  })

  it('previews the sample workbook with warnings before importing', async () => {
    const user = userEvent.setup()
    await renderApp()

    await user.click(screen.getByRole('button', { name: 'Import Excel' }))
    await user.click(screen.getByText('Use sample workbook'))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Sample data')).toBeInTheDocument()
    expect(within(dialog).getByText('sample-attendance-2026.xlsx')).toBeInTheDocument()
    expect(within(dialog).getByText(/Missing months treated as zero/)).toBeVisible()
    expect(within(dialog).getByLabelText('Sheet')).toHaveDisplayValue('Workers')
  })

  it('updates every dashboard readout after a sample import', async () => {
    const user = userEvent.setup()
    await renderApp()
    await selectSeptember()

    const trend = screen.getByRole('table', { name: 'Monthly late-minute totals' })
    const workerTable = screen.getByRole('table', {
      name: /worker late-minute totals/i,
    })

    expect(metricText('Sep team total', 1)).toBe('250 min')
    expect(metricText('Workers with lateness', 1)).toBe('10')
    expect(within(trend).getByRole('row', { name: /^September/ })).toBeInTheDocument()
    expect(monthMinutesRow('September')).toBe('250')
    expect(within(workerTable).getByText('Avery Reyes')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Import Excel' }))
    await user.click(screen.getByText('Use sample workbook'))
    await user.click(screen.getByRole('button', { name: 'Replace dataset' }))

    await waitFor(() =>
      expect(dataSourceNotice().getByText('Imported dataset')).toBeInTheDocument(),
    )
    expect(metricText('Sep team total', 1)).toBe('328 min')
    expect(metricText('Workers with lateness', 1)).toBe('9')
    expect(monthMinutesRow('September')).toBe('328')
    expect(
      within(
        screen.getByRole('table', { name: /worker late-minute totals/i }),
      ).getByText('Nadia P. Aguilar'),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/sample-attendance-2026\.xlsx/).length).toBeGreaterThan(0)
  })

  it('returns to demo data with restore demo', async () => {
    const user = userEvent.setup()
    await renderApp()
    await selectSeptember()

    await user.click(screen.getByRole('button', { name: 'Import Excel' }))
    await user.click(screen.getByText('Use sample workbook'))
    await user.click(screen.getByRole('button', { name: 'Replace dataset' }))
    await waitFor(() =>
      expect(dataSourceNotice().getByText('Imported dataset')).toBeInTheDocument(),
    )

    await user.click(screen.getByRole('button', { name: 'Restore demo' }))

    await waitFor(() =>
      expect(
        screen.queryByRole('region', { name: 'Data source' }),
      ).toBeNull(),
    )
    expect(screen.getByText('Demo data')).toBeInTheDocument()
    expect(metricText('Sep team total', 1)).toBe('250 min')
  })

  it('opens and closes the manage employees dialog from the header', async () => {
    const user = userEvent.setup()
    await renderApp()

    const actionsBtn = screen.getByRole('button', { name: /actions/i })
    await user.click(actionsBtn)

    const manageBtn = screen.getByRole('menuitem', { name: 'Manage Employees' })
    await user.click(manageBtn)

    expect(
      screen.getByRole('heading', { level: 2, name: 'Manage Employees' }),
    ).toBeInTheDocument()

    const closeBtn = screen.getByRole('button', { name: 'Close dialog' })
    await user.click(closeBtn)

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { level: 2, name: 'Manage Employees' }),
      ).toBeNull()
    })
  })

  describe('with an empty imported dataset', () => {
    beforeEach(() => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 1,
          source: 'upload',
          fileName: 'empty.xlsx',
          sheetName: 'Workers',
          workers: [],
        }),
      )
    })

    it('keeps the page heading and shows an actionable empty state', async () => {
      await renderApp()

      expect(
        screen.getByRole('heading', { level: 1, name: 'Lateness dashboard' }),
      ).toBeInTheDocument()
      expect(screen.getByText('No worker data yet')).toBeInTheDocument()
      expect(screen.queryByRole('table')).toBeNull()
    })

    it('keeps the page heading on the worker view too', async () => {
      setEmployeeAuth()
      await renderApp()

      expect(
        screen.getByRole('heading', { level: 1, name: 'My late records' }),
      ).toBeInTheDocument()
      expect(screen.getByText('No worker records yet')).toBeInTheDocument()
    })
  })
})
