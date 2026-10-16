import { getAuthHeaders } from './auth'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export interface AttendanceRecord {
  id: string | null
  month: number
  minutesLate: number
  importId: string | null
  createdAt: string | null
}

export interface EmployeeYearAttendance {
  employeeId: string
  year: number
  months: AttendanceRecord[]
}

export interface UpsertAttendanceInput {
  employeeId: string
  year: number
  month: number
  minutesLate: number
}

export interface UpdateAttendanceInput {
  minutesLate: number
}

export interface AttendanceRecordFull {
  id: string
  employeeId: string
  year: number
  month: number
  minutesLate: number
  importId: string | null
  createdAt: string
}

export class AttendanceApiError extends Error {
  status: number
  details?: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'AttendanceApiError'
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
    throw new AttendanceApiError(message, res.status, body)
  }

  return body as T
}

export async function upsertAttendance(
  input: UpsertAttendanceInput,
): Promise<AttendanceRecordFull> {
  const res = await fetch(`${API_BASE}/api/admin/attendance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(input),
  })
  return handleResponse<AttendanceRecordFull>(res)
}

export async function updateAttendance(
  id: string,
  input: UpdateAttendanceInput,
): Promise<AttendanceRecordFull> {
  const res = await fetch(`${API_BASE}/api/admin/attendance/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(input),
  })
  return handleResponse<AttendanceRecordFull>(res)
}

export async function deleteAttendance(id: string): Promise<AttendanceRecordFull> {
  const res = await fetch(`${API_BASE}/api/admin/attendance/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  return handleResponse<AttendanceRecordFull>(res)
}

export async function getEmployeeYearAttendance(
  employeeId: string,
  year: number,
): Promise<EmployeeYearAttendance> {
  const res = await fetch(`${API_BASE}/api/admin/attendance/${employeeId}/${year}`, {
    headers: getAuthHeaders(),
  })
  return handleResponse<EmployeeYearAttendance>(res)
}
