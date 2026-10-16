import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AppHeader } from './AppHeader'

describe('AppHeader', () => {
  it('toggles actions dropdown menu on desktop', async () => {
    const user = userEvent.setup()
    const onOpenEmployees = vi.fn()
    const onOpenAttendance = vi.fn()
    const onSignOut = vi.fn()

    render(
      <AppHeader
        role="manager"
        isAdmin={false}
        source="server"
        onOpenImport={vi.fn()}
        onOpenEmployees={onOpenEmployees}
        onOpenAttendance={onOpenAttendance}
        onSignOut={onSignOut}
      />,
    )

    // Actions dropdown menu is closed initially
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.queryByText('Manage Employees')).not.toBeInTheDocument()

    // Click Actions button
    const actionsTrigger = screen.getByRole('button', { name: /actions/i })
    await user.click(actionsTrigger)

    // Dropdown is open
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Manage Employees' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Manual Attendance' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Reset Data' })).not.toBeInTheDocument()

    // Click an action
    await user.click(screen.getByRole('menuitem', { name: 'Manage Employees' }))
    expect(onOpenEmployees).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('shows Reset Data in actions menu when user is admin', async () => {
    const user = userEvent.setup()
    const onOpenReset = vi.fn()

    render(
      <AppHeader
        role="manager"
        isAdmin={true}
        source="server"
        onOpenImport={vi.fn()}
        onOpenEmployees={vi.fn()}
        onOpenAttendance={vi.fn()}
        onOpenReset={onOpenReset}
        onSignOut={vi.fn()}
      />,
    )

    const actionsTrigger = screen.getByRole('button', { name: /actions/i })
    await user.click(actionsTrigger)

    const resetBtn = screen.getByRole('menuitem', { name: 'Reset Data' })
    expect(resetBtn).toBeInTheDocument()

    await user.click(resetBtn)
    expect(onOpenReset).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('renders Change PIN for admin in actions menu', async () => {
    const user = userEvent.setup()
    const onChangePin = vi.fn()

    render(
      <AppHeader
        role="manager"
        isAdmin={true}
        source="server"
        onOpenImport={vi.fn()}
        onChangePin={onChangePin}
        onSignOut={vi.fn()}
      />,
    )

    const actionsTrigger = screen.getByRole('button', { name: /actions/i })
    await user.click(actionsTrigger)

    const changePinBtn = screen.getByRole('menuitem', { name: 'Change PIN' })
    expect(changePinBtn).toBeInTheDocument()

    await user.click(changePinBtn)
    expect(onChangePin).toHaveBeenCalledTimes(1)
  })

  it('closes dropdown on Escape key', async () => {
    const user = userEvent.setup()
    render(
      <AppHeader
        role="manager"
        source="server"
        onOpenImport={vi.fn()}
        onSignOut={vi.fn()}
      />,
    )

    const actionsTrigger = screen.getByRole('button', { name: /actions/i })
    await user.click(actionsTrigger)
    expect(screen.getByRole('menu')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('renders worker actions like Change PIN in dropdown', async () => {
    const user = userEvent.setup()
    const onChangePin = vi.fn()

    render(
      <AppHeader
        role="worker"
        source="server"
        onOpenImport={vi.fn()}
        onChangePin={onChangePin}
        onSignOut={vi.fn()}
      />,
    )

    const actionsTrigger = screen.getByRole('button', { name: /actions/i })
    await user.click(actionsTrigger)

    expect(screen.getByRole('menuitem', { name: 'Change PIN' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Manage Employees' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('menuitem', { name: 'Change PIN' }))
    expect(onChangePin).toHaveBeenCalledTimes(1)
  })
})
