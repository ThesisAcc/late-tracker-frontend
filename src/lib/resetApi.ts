import { getAuthHeaders } from './auth'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export interface ResetPreviewSummary {
  nonAdminUsersCount: number
  nonAdminEmployeesCount: number
  attendanceRecordsCount: number
  importsCount: number
  importIssuesCount: number
}

export interface ResetPreviewUser {
  id: string
  role: string
  status: string
  employeeId?: string
  employee?: {
    id: string
    employeeCode: string
    firstName: string
    middleName?: string | null
    lastName: string
    status: string
  }
}

export interface ResetPreviewEmployee {
  id: string
  employeeCode: string
  firstName: string
  middleName?: string | null
  lastName: string
  status: string
}

export interface ResetPreviewAttendance {
  id: string
  employeeId: string
  year: number
  month: number
  minutesLate: number
}

export interface ResetPreviewImport {
  id: string
  year: number
  filename: string
  status: string
  createdAt: string
  uploadedByUserId: string | null
}

export interface ResetPreviewIssue {
  id: string
  importId: string
  employeeId: string
  issueType: string
  message: string
}

export interface ResetPreviewResponse {
  summary: ResetPreviewSummary
  users: ResetPreviewUser[]
  employees: ResetPreviewEmployee[]
  attendanceRecords: ResetPreviewAttendance[]
  imports: ResetPreviewImport[]
  importIssues: ResetPreviewIssue[]
}

export interface ResetApiResponse {
  message?: string
  success?: boolean
  deleted?: unknown
}

export class ResetApiError extends Error {
  status: number
  details?: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ResetApiError'
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
    const errorBody = body as { message?: string; details?: unknown } | undefined
    throw new ResetApiError(
      errorBody?.message ?? `Request failed with status ${res.status}`,
      res.status,
      errorBody?.details,
    )
  }

  return body as T
}

/**
 * Fetch preview of all records that will be deleted upon resetting data.
 */
export async function fetchResetPreview(): Promise<ResetPreviewResponse> {
  const res = await fetch(`${API_BASE}/api/admin/reset/preview`, {
    headers: getAuthHeaders(),
  })
  return handleResponse<ResetPreviewResponse>(res)
}

/**
 * Execute system reset to wipe all non-admin data.
 */
export async function executeReset(): Promise<ResetApiResponse> {
  const res = await fetch(`${API_BASE}/api/admin/reset`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ confirm: 'RESET_NON_ADMIN_DATA' }),
  })
  return handleResponse<ResetApiResponse>(res)
}

/**
 * Triggers a download of the full preview backup JSON file.
 */
export function downloadResetBackup(data: ResetPreviewResponse): void {
  const jsonStr = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const dateStr = new Date().toISOString().split('T')[0]
  a.download = `latetrack_backup_${dateStr}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}
