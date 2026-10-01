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
})
