import { getAuthHeaders } from './auth'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export interface EmployeeUser {
  id: string
  role: string
  status: string
}

export interface EmployeeRecord {
  id: string
  employeeCode: string
  firstName: string
  middleName?: string | null
  lastName: string
  status: 'ACTIVE' | 'INACTIVE'
  createdAt?: string
  updatedAt?: string
  user?: EmployeeUser | null
  generatedPin?: string
}

export interface CreateEmployeeInput {
  employeeCode: string
  firstName: string
  middleName?: string | null
  lastName: string
  pin?: string
}

export interface UpdateEmployeeInput {
  firstName?: string
  middleName?: string | null
  lastName?: string
  status?: 'ACTIVE' | 'INACTIVE'
}

export interface ResetPasswordResponse {
  message: string
}

export class EmployeesApiError extends Error {
  status: number
  details?: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'EmployeesApiError'
    this.status = status
    this.details = details
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  let body: unknown
  try {
    body = await res.json()
  } catch {
    /* empty */
  }

  if (!res.ok) {
    const errorBody = body as { message?: string; error?: string } | undefined
    const message =
      errorBody?.message ?? errorBody?.error ?? `Request failed with status ${res.status}`
    throw new EmployeesApiError(message, res.status, body)
  }

  return body as T
}

export async function listEmployees(): Promise<EmployeeRecord[]> {
  const res = await fetch(`${API_BASE}/api/admin/employees`, {
    headers: getAuthHeaders(),
  })
  return handleResponse<EmployeeRecord[]>(res)
}

export async function createEmployee(
  input: CreateEmployeeInput,
): Promise<EmployeeRecord> {
  const res = await fetch(`${API_BASE}/api/admin/employees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(input),
  })
  return handleResponse<EmployeeRecord>(res)
}

export async function updateEmployee(
  id: string,
  input: UpdateEmployeeInput,
): Promise<EmployeeRecord> {
  const res = await fetch(`${API_BASE}/api/admin/employees/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(input),
  })
  return handleResponse<EmployeeRecord>(res)
}

export async function deleteEmployee(id: string): Promise<EmployeeRecord> {
  const res = await fetch(`${API_BASE}/api/admin/employees/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  return handleResponse<EmployeeRecord>(res)
}

export async function resetEmployeePassword(
  id: string,
): Promise<ResetPasswordResponse> {
  const res = await fetch(`${API_BASE}/api/admin/employees/${id}/reset-password`, {
    method: 'POST',
    headers: getAuthHeaders(),
  })
  return handleResponse<ResetPasswordResponse>(res)
}
