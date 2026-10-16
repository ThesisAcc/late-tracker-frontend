import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as loginApi from '../../lib/loginApi'
import { ChangePinDialog } from './ChangePinDialog'

vi.mock('../../lib/loginApi', () => ({
  changePassword: vi.fn(),
}))

describe('ChangePinDialog', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the PIN fields when opened', () => {
    render(<ChangePinDialog onClose={onClose} />)

    expect(screen.getByRole('heading', { name: 'Change PIN' })).toBeInTheDocument()
    expect(screen.getByLabelText('Current PIN')).toBeInTheDocument()
    expect(screen.getByLabelText('New PIN')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm New PIN')).toBeInTheDocument()
  })

  it('rejects a current PIN that is not 4 digits', async () => {
    const user = userEvent.setup()
    render(<ChangePinDialog onClose={onClose} />)

    await user.type(screen.getByLabelText('Current PIN'), '12')
    await user.type(screen.getByLabelText('New PIN'), '5678')
    await user.type(screen.getByLabelText('Confirm New PIN'), '5678')
    await user.click(screen.getByRole('button', { name: 'Change PIN' }))

    expect(
      screen.getByText('Current PIN must be exactly 4 digits.'),
    ).toBeInTheDocument()
    expect(loginApi.changePassword).not.toHaveBeenCalled()
  })

  it('rejects a new PIN matching the current PIN', async () => {
    const user = userEvent.setup()
    render(<ChangePinDialog onClose={onClose} />)

    await user.type(screen.getByLabelText('Current PIN'), '1234')
    await user.type(screen.getByLabelText('New PIN'), '1234')
    await user.type(screen.getByLabelText('Confirm New PIN'), '1234')
    await user.click(screen.getByRole('button', { name: 'Change PIN' }))

    expect(
      screen.getByText('New PIN must be different from current PIN.'),
    ).toBeInTheDocument()
    expect(loginApi.changePassword).not.toHaveBeenCalled()
  })

  it('rejects a mismatched confirmation PIN', async () => {
    const user = userEvent.setup()
    render(<ChangePinDialog onClose={onClose} />)

    await user.type(screen.getByLabelText('Current PIN'), '1234')
    await user.type(screen.getByLabelText('New PIN'), '5678')
    await user.type(screen.getByLabelText('Confirm New PIN'), '5679')
    await user.click(screen.getByRole('button', { name: 'Change PIN' }))

    expect(
      screen.getByText('New PIN and confirmation do not match.'),
    ).toBeInTheDocument()
    expect(loginApi.changePassword).not.toHaveBeenCalled()
  })

  it('submits the current and new PIN and shows the success message', async () => {
    const user = userEvent.setup()
    vi.mocked(loginApi.changePassword).mockResolvedValueOnce({
      message: 'Password changed successfully',
    })
    render(<ChangePinDialog onClose={onClose} />)

    await user.type(screen.getByLabelText('Current PIN'), '1234')
    await user.type(screen.getByLabelText('New PIN'), '5678')
    await user.type(screen.getByLabelText('Confirm New PIN'), '5678')
    await user.click(screen.getByRole('button', { name: 'Change PIN' }))

    await waitFor(() => {
      expect(loginApi.changePassword).toHaveBeenCalledWith({
        currentPin: '1234',
        newPin: '5678',
      })
    })
    expect(screen.getByText('Password changed successfully')).toBeInTheDocument()
  })

  it('shows the server error message when the current PIN is incorrect', async () => {
    const user = userEvent.setup()
    vi.mocked(loginApi.changePassword).mockRejectedValueOnce(
      new Error('Current PIN is incorrect'),
    )
    render(<ChangePinDialog onClose={onClose} />)

    await user.type(screen.getByLabelText('Current PIN'), '0000')
    await user.type(screen.getByLabelText('New PIN'), '5678')
    await user.type(screen.getByLabelText('Confirm New PIN'), '5678')
    await user.click(screen.getByRole('button', { name: 'Change PIN' }))

    await waitFor(() => {
      expect(screen.getByText('Current PIN is incorrect')).toBeInTheDocument()
    })
  })
})
