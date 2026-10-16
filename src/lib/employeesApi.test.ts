import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createEmployee,
  deleteEmployee,
  listEmployees,
  resetEmployeePassword,
  updateEmployee,
} from './employeesApi'

describe('employeesApi', () => {
  const fetchSpy = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchSpy)
    localStorage.setItem('latetrack-auth-token', 'mock-token')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('lists employees with auth headers', async () => {
    const mockList = [
      {
        id: 'uuid-1',
        employeeCode: 'EMP-1001',
        firstName: 'John',
        lastName: 'Doe',
        status: 'ACTIVE',
      },
    ]
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockList,
    })

    const result = await listEmployees()
    expect(result).toEqual(mockList)
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/employees'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-token',
        }),
      }),
    )
  })

  it('creates employee via POST', async () => {
    const input = {
      employeeCode: 'EMP-1002',
      firstName: 'Jane',
      middleName: 'M',
      lastName: 'Smith',
      pin: '1234',
    }
    const mockResponse = { id: 'uuid-2', ...input, status: 'ACTIVE' }
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const result = await createEmployee(input)
    expect(result).toEqual(mockResponse)
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/employees'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        }),
        body: JSON.stringify(input),
      }),
    )
  })

  it('updates employee via PATCH /:id', async () => {
    const input = { firstName: 'Updated', status: 'INACTIVE' as const }
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'uuid-1', ...input }),
    })

    const result = await updateEmployee('uuid-1', input)
    expect(result.firstName).toBe('Updated')
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/employees/uuid-1'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    )
  })

  it('deletes employee via DELETE /:id', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'uuid-1', employeeCode: 'EMP-1001' }),
    })

    const result = await deleteEmployee('uuid-1')
    expect(result.id).toBe('uuid-1')
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/employees/uuid-1'),
      expect.objectContaining({
        method: 'DELETE',
      }),
    )
  })

  it('resets employee password via POST /:id/reset-password', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Password reset to default 1234 successfully' }),
    })

    const result = await resetEmployeePassword('uuid-1')
    expect(result.message).toContain('Password reset')
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/employees/uuid-1/reset-password'),
      expect.objectContaining({
        method: 'POST',
      }),
    )
  })

  it('throws EmployeesApiError on error response', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Cannot delete your own account' }),
    })

    await expect(deleteEmployee('uuid-self')).rejects.toThrow(
      'Cannot delete your own account',
    )
  })
})
