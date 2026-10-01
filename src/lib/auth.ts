export const AUTH_TOKEN_KEY = 'latetrack-auth-token'

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

export function getAuthHeaders(): HeadersInit {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
