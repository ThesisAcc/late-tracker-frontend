import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as employeesApi from '../../lib/employeesApi'
import { ManageEmployeesDialog } from './ManageEmployeesDialog'

vi.mock('../../lib/employeesApi', () => ({
  listEmployees: vi.fn(),
  createEmployee: vi.fn(),
  updateEmployee: vi.fn(),
  deleteEmployee: vi.fn(),
  resetEmployeePassword: vi.fn(),
}))

const mockEmployees: employeesApi.EmployeeRecord[] = [
  {
    id: 'emp-1',
    employeeCode: 'EMP-1001',
    firstName: 'Alice',
    middleName: 'B',
    lastName: 'Walker',
    status: 'ACTIVE',
    user: { id: 'user-1', role: 'EMPLOYEE', status: 'ACTIVE' },
  },
  {
    id: 'emp-2',
    employeeCode: 'EMP-1002',
    firstName: 'Bob',
    middleName: null,
    lastName: 'Smith',
    status: 'INACTIVE',
    user: { id: 'user-2', role: 'EMPLOYEE', status: 'INACTIVE' },
  },
]

describe('ManageEmployeesDialog', () => {
  const onClose = vi.fn()
  const onEmployeesUpdated = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(employeesApi.listEmployees).mockResolvedValue(mockEmployees)
  })

  it('renders employee list when opened', async () => {
    render(<ManageEmployeesDialog onClose={onClose} />)

    expect(screen.getByText('Loading employees…')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('EMP-1001')).toBeInTheDocument()
      expect(screen.getByText('Alice B Walker')).toBeInTheDocument()
      expect(screen.getByText('EMP-1002')).toBeInTheDocument()
      expect(screen.getByText('Bob Smith')).toBeInTheDocument()
    })
  })

  it('filters employees by search term', async () => {
    const user = userEvent.setup()
    render(<ManageEmployeesDialog onClose={onClose} />)

    await waitFor(() => {
      expect(screen.getByText('EMP-1001')).toBeInTheDocument()
    })

    const searchInput = screen.getByLabelText('Search employees')
    await user.type(searchInput, 'Alice')

    expect(screen.getByText('Alice B Walker')).toBeInTheDocument()
    expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument()
  })

  it('adds an employee via form', async () => {
    const user = userEvent.setup()
    vi.mocked(employeesApi.createEmployee).mockResolvedValueOnce({
      id: 'emp-3',
      employeeCode: 'EMP-1003',
      firstName: 'Charlie',
      lastName: 'Brown',
      status: 'ACTIVE',
    })

    render(
      <ManageEmployeesDialog
        onClose={onClose}
        onEmployeesUpdated={onEmployeesUpdated}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('+ Add Employee')).toBeInTheDocument()
    })

    await user.click(screen.getByText('+ Add Employee'))

    expect(screen.getByText('Add New Employee')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('e.g. EMP-1001'), '1003')
    await user.type(screen.getByPlaceholderText('First name'), 'Charlie')
    await user.type(screen.getByPlaceholderText('Last name'), 'Brown')
    await user.click(screen.getByRole('button', { name: 'Save Employee' }))

    await waitFor(() => {
      expect(employeesApi.createEmployee).toHaveBeenCalledWith({
        employeeCode: 'EMP-1003',
        firstName: 'Charlie',
        middleName: null,
        lastName: 'Brown',
      })
      expect(onEmployeesUpdated).toHaveBeenCalled()
    })
  })

  it('edits an employee', async () => {
    const user = userEvent.setup()
    vi.mocked(employeesApi.updateEmployee).mockResolvedValueOnce({
      ...mockEmployees[0],
      firstName: 'Alicia',
      status: 'INACTIVE',
    })

    render(
      <ManageEmployeesDialog
        onClose={onClose}
        onEmployeesUpdated={onEmployeesUpdated}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('EMP-1001')).toBeInTheDocument()
    })

    const editButtons = screen.getAllByRole('button', { name: 'Edit' })
    await user.click(editButtons[0])

    expect(
      screen.getByText('Edit Employee: EMP-1001'),
    ).toBeInTheDocument()

    const firstNameInput = screen.getByDisplayValue('Alice')
    await user.clear(firstNameInput)
    await user.type(firstNameInput, 'Alicia')

    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => {
      expect(employeesApi.updateEmployee).toHaveBeenCalledWith(
        'emp-1',
        expect.objectContaining({
          firstName: 'Alicia',
        }),
      )
      expect(onEmployeesUpdated).toHaveBeenCalled()
    })
  })

  it('resets an employee PIN', async () => {
    const user = userEvent.setup()
    vi.mocked(employeesApi.resetEmployeePassword).mockResolvedValueOnce({
      message: 'Password reset to default 1234 successfully',
    })

    render(<ManageEmployeesDialog onClose={onClose} />)

    await waitFor(() => {
      expect(screen.getByText('EMP-1001')).toBeInTheDocument()
    })

    const resetButtons = screen.getAllByRole('button', { name: 'Reset PIN' })
    await user.click(resetButtons[0])

    expect(screen.getByText('Reset Employee PIN')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Reset PIN to 1234' }),
    )

    await waitFor(() => {
      expect(employeesApi.resetEmployeePassword).toHaveBeenCalledWith('emp-1')
      expect(
        screen.getByText(/Password reset to default 1234 successfully/i),
      ).toBeInTheDocument()
    })
  })

  it('deletes an employee', async () => {
    const user = userEvent.setup()
    vi.mocked(employeesApi.deleteEmployee).mockResolvedValueOnce(mockEmployees[0])

    render(
      <ManageEmployeesDialog
        onClose={onClose}
        onEmployeesUpdated={onEmployeesUpdated}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('EMP-1001')).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
    await user.click(deleteButtons[0])

    expect(screen.getByText('Delete Employee')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Yes, Delete Employee' }),
    )

    await waitFor(() => {
      expect(employeesApi.deleteEmployee).toHaveBeenCalledWith('emp-1')
      expect(onEmployeesUpdated).toHaveBeenCalled()
    })
  })

  it('calls onClose when close icon is clicked', async () => {
    const user = userEvent.setup()
    render(<ManageEmployeesDialog onClose={onClose} />)

    const closeBtn = screen.getByRole('button', { name: 'Close dialog' })
    await user.click(closeBtn)

    expect(onClose).toHaveBeenCalled()
  })
})
