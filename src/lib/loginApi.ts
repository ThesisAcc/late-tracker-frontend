import { setAuthToken } from './auth'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export interface LoginRequest {
  fullName: string
  pin: string
}

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

export interface LoginResponse {
  token: string
  user: AuthenticatedUser
}

export class LoginError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'LoginError'
    this.status = status
  }
}

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })

  let body: Partial<LoginResponse> & { message?: string } = {}
  try {
    body = await response.json()
  } catch {
    // Preserve the HTTP status when a server returns no JSON body.
  }

  if (!response.ok) {
    const message =
      response.status === 429
        ? 'Too many login attempts'
        : body.message || 'Invalid full name or PIN'
    throw new LoginError(message, response.status)
  }

  if (!body.token || !body.user) {
    throw new LoginError('The server returned an invalid login response', 502)
  }

  setAuthToken(body.token)
  return body as LoginResponse
}
