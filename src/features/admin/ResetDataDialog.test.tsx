import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as resetApi from '../../lib/resetApi'
import { ResetDataDialog } from './ResetDataDialog'

const mockPreview: resetApi.ResetPreviewResponse = {
  summary: {
    nonAdminUsersCount: 12,
    nonAdminEmployeesCount: 12,
    attendanceRecordsCount: 168,
    importsCount: 4,
    importIssuesCount: 1,
  },
  users: [],
  employees: [],
  attendanceRecords: [],
  imports: [],
  importIssues: [],
}

describe('ResetDataDialog', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('loads and displays reset preview summary', async () => {
    vi.spyOn(resetApi, 'fetchResetPreview').mockResolvedValue(mockPreview)

    render(<ResetDataDialog onClose={vi.fn()} />)

    expect(screen.getByText('Loading reset preview from server…')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('168')).toBeInTheDocument()
      expect(screen.getByText('Attendance records')).toBeInTheDocument()
      expect(screen.getAllByText('12')).toHaveLength(2)
      expect(screen.getByText('Employees')).toBeInTheDocument()
      expect(screen.getByText('User accounts')).toBeInTheDocument()
    })
  })

  it('triggers backup download when button is clicked', async () => {
    const user = userEvent.setup()
    vi.spyOn(resetApi, 'fetchResetPreview').mockResolvedValue(mockPreview)
    const downloadSpy = vi.spyOn(resetApi, 'downloadResetBackup').mockImplementation(() => {})

    render(<ResetDataDialog onClose={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Download current data' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Download current data' }))

    expect(downloadSpy).toHaveBeenCalledWith(mockPreview)
    expect(screen.getByText('✓ Backup file downloaded to your device.')).toBeInTheDocument()
  })

  it('keeps reset button disabled until typing exact confirmation phrase', async () => {
    const user = userEvent.setup()
    vi.spyOn(resetApi, 'fetchResetPreview').mockResolvedValue(mockPreview)
    const executeSpy = vi.spyOn(resetApi, 'executeReset').mockResolvedValue({ message: 'Success' })
    const onResetComplete = vi.fn()

    render(<ResetDataDialog onClose={vi.fn()} onResetComplete={onResetComplete} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Reset all data' })).toBeDisabled()
    })

    const input = screen.getByPlaceholderText('RESET_NON_ADMIN_DATA')
    await user.type(input, 'WRONG_TEXT')
    expect(screen.getByRole('button', { name: 'Reset all data' })).toBeDisabled()

    await user.clear(input)
    await user.type(input, 'RESET_NON_ADMIN_DATA')
    expect(screen.getByRole('button', { name: 'Reset all data' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Reset all data' }))

    await waitFor(() => {
      expect(executeSpy).toHaveBeenCalledTimes(1)
      expect(onResetComplete).toHaveBeenCalledTimes(1)
      expect(screen.getByText(/Application data has been reset/)).toBeInTheDocument()
    })
  })

  it('displays error if preview fails', async () => {
    vi.spyOn(resetApi, 'fetchResetPreview').mockRejectedValue(new Error('Network error'))

    render(<ResetDataDialog onClose={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('closes when Cancel is clicked', async () => {
    const user = userEvent.setup()
    vi.spyOn(resetApi, 'fetchResetPreview').mockResolvedValue(mockPreview)
    const onClose = vi.fn()

    render(<ResetDataDialog onClose={onClose} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
