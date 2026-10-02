export const AUTH_TOKEN_KEY = 'latetrack-auth-token'
export const AUTH_USER_KEY = 'latetrack-auth-user'

export interface AuthenticatedUser {
  id: string
  role: string
  employee: {
    id: string
    employeeCode: string
    firstName: string
    lastName: string
  }
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null
  }
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export function clearAuthToken(): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }
  localStorage.removeItem(AUTH_TOKEN_KEY)
}

export function getAuthUser(): AuthenticatedUser | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null
  }
  const userJson = localStorage.getItem(AUTH_USER_KEY)
  if (!userJson) {
    return null
  }
  try {
    return JSON.parse(userJson)
  } catch {
    return null
  }
}

export function setAuthUser(user: AuthenticatedUser): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
}

export function clearAuthUser(): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }
  localStorage.removeItem(AUTH_USER_KEY)
}

export function clearAuth(): void {
  clearAuthToken()
  clearAuthUser()
}

export function getAuthHeaders(): HeadersInit {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
