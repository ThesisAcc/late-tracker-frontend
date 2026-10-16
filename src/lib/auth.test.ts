import { beforeEach, describe, expect, it } from 'vitest'
import {
  AUTH_TOKEN_KEY,
  clearAuthToken,
  getAuthHeaders,
  getAuthToken,
  setAuthToken,
} from './auth'

describe('auth helper module', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('gets null when no token is stored', () => {
    expect(getAuthToken()).toBeNull()
  })

  it('sets and gets the auth token', () => {
    setAuthToken('jwt-token-123')
    expect(getAuthToken()).toBe('jwt-token-123')
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('jwt-token-123')
  })

  it('clears the auth token', () => {
    setAuthToken('jwt-token-123')
    clearAuthToken()
    expect(getAuthToken()).toBeNull()
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull()
  })

  it('returns empty headers when no token is present', () => {
    expect(getAuthHeaders()).toEqual({})
  })

  it('returns a bearer Authorization header when token is present', () => {
    setAuthToken('jwt-secret-xyz')
    expect(getAuthHeaders()).toEqual({
      Authorization: `Bearer ${'jwt-secret-xyz'}`,
    })
  })

  it('correctly checks manager and admin user roles', async () => {
    const { isAdminUser, isManagerUser } = await import('./auth')
    expect(isAdminUser(null)).toBe(false)
    expect(isAdminUser({ id: '1', role: 'EMPLOYEE', employee: { id: 'e1', employeeCode: '1', firstName: 'A', lastName: 'B' } })).toBe(false)
    expect(isAdminUser({ id: '1', role: 'MANAGER', employee: { id: 'e1', employeeCode: '1', firstName: 'A', lastName: 'B' } })).toBe(false)
    expect(isAdminUser({ id: '1', role: 'ADMIN', employee: { id: 'e1', employeeCode: '1', firstName: 'A', lastName: 'B' } })).toBe(true)
    expect(isAdminUser({ id: '1', role: 'admin', employee: { id: 'e1', employeeCode: '1', firstName: 'A', lastName: 'B' } })).toBe(true)

    expect(isManagerUser(null)).toBe(false)
    expect(isManagerUser({ id: '1', role: 'EMPLOYEE', employee: { id: 'e1', employeeCode: '1', firstName: 'A', lastName: 'B' } })).toBe(false)
    expect(isManagerUser({ id: '1', role: 'MANAGER', employee: { id: 'e1', employeeCode: '1', firstName: 'A', lastName: 'B' } })).toBe(true)
    expect(isManagerUser({ id: '1', role: 'ADMIN', employee: { id: 'e1', employeeCode: '1', firstName: 'A', lastName: 'B' } })).toBe(true)
  })
})
