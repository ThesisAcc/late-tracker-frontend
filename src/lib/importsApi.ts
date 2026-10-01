import { getAuthHeaders } from './auth'
import { MONTHS } from './months'
import type { MonthlyMinutes, Worker } from './types'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

// ────────────────────────────────────────────
// Types mirroring the backend response shapes
// ────────────────────────────────────────────

export interface ImportIssueApi {
  rowNumber: number | null
  column: string
  issueType:
    | 'UNKNOWN_EMPLOYEE'
    | 'AMBIGUOUS_EMPLOYEE'
    | 'INVALID_MONTH'
    | 'INVALID_MINUTES'
    | 'INVALID_FILE_FORMAT'
    | 'DUPLICATE_RECORD'
    | 'HISTORICAL_MISMATCH'
  severity: 'ERROR' | 'WARNING'
  message: string
  existingValue?: number | null
  uploadedValue?: number | null
}

export interface ImportWorkerApi {
  employeeCode: string
  firstName: string
  middleName: string | null
  lastName: string
  isNewEmployee: boolean
  totalMinutes: number
  /** Keys are lowercase month names: "january" … "december" */
  monthlyMinutes: Record<string, number>
}

export interface PreviewSummary {
  totalRows: number
  validWorkers: number
  totalMinutesLate: number
  newEmployeesCount: number
  existingEmployeesCount: number
  conflictsCount: number
  errorsCount: number
  warningsCount: number
}

export interface PreviewResponse {
  isValid: boolean
  fileName: string
  sheetName: string
  year: number
  availableSheets: string[]
  summary: PreviewSummary
  issues: ImportIssueApi[]
  workers: ImportWorkerApi[]
}

export interface ImportSummary {
  employeesCreated: number
  employeesExisting: number
  recordsUpserted: number
  totalMinutesLate: number
  issuesLogged: number
  warningsCount: number
}

export interface ImportResponse {
  importId: string
  status: 'SUCCESS'
  fileName: string
  sheetName: string
  year: number
  importedAt: string
  summary: ImportSummary
  issues: ImportIssueApi[] // warnings only
  workers: ImportWorkerApi[]
}

export interface ApiErrorDetail {
  totalErrors?: number
  errors?: Array<{
    row?: number | null
    rowNumber?: number | null
    column: string
    issueType?: string
    message: string
  }>
}

export class ApiError extends Error {
  details?: ApiErrorDetail

  constructor(message: string, details?: ApiErrorDetail) {
    super(message)
    this.name = 'ApiError'
    this.details = details
  }
}

// ────────────────────────────────────────────
// Helper
// ────────────────────────────────────────────

async function throwIfError(res: Response): Promise<void> {
  if (res.ok) return
  let body: { message?: string; details?: ApiErrorDetail } = {}
  try {
    body = await res.json()
  } catch {
    /* ignore parse failure */
  }
  const message = body.message ?? `HTTP ${res.status}`
  throw new ApiError(message, body.details)
}

// ────────────────────────────────────────────
// API calls
// ────────────────────────────────────────────

/**
 * Dry-run: parse workbook, cross-check employees, detect conflicts.
 * Nothing is written to the database.
 */
export async function previewImport(
  file: File,
  year: number,
  sheetName?: string,
  createMissingEmployees = true,
): Promise<PreviewResponse> {
  const form = new FormData()
  form.append('file', file)
  form.append('year', String(year))
  if (sheetName) form.append('sheetName', sheetName)
  form.append('createMissingEmployees', String(createMissingEmployees))

  const res = await fetch(`${API_BASE}/api/admin/imports/preview`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: form,
  })
  await throwIfError(res)
  return res.json() as Promise<PreviewResponse>
}

/**
 * Execute import: commit all valid rows to the database.
 */
export async function executeImport(
  file: File,
  year: number,
  sheetName?: string,
  createMissingEmployees = true,
): Promise<ImportResponse> {
  const form = new FormData()
  form.append('file', file)
  form.append('year', String(year))
  if (sheetName) form.append('sheetName', sheetName)
  form.append('createMissingEmployees', String(createMissingEmployees))

  const res = await fetch(`${API_BASE}/api/admin/imports`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: form,
  })
  await throwIfError(res)
  return res.json() as Promise<ImportResponse>
}

/**
 * Download the blank .xlsx template (opens a browser download).
 */
export function downloadTemplate(): void {
  window.open(`${API_BASE}/api/admin/imports/template`, '_blank')
}

export interface ImportHistoryItem {
  id: string
  fileName: string
  sheetName: string
  year: number
  status: string
  importedAt: string
  recordsUpserted?: number
  issuesLogged?: number
}

export interface ImportDetailResponse {
  import: ImportHistoryItem
  issues: ImportIssueApi[]
}

/**
 * List import history.
 */
export async function getImportsList(): Promise<ImportHistoryItem[]> {
  const res = await fetch(`${API_BASE}/api/admin/imports`, {
    headers: getAuthHeaders(),
  })
  await throwIfError(res)
  return res.json() as Promise<ImportHistoryItem[]>
}

/**
 * Import details + logged issues.
 */
export async function getImportDetails(id: string): Promise<ImportDetailResponse> {
  const res = await fetch(`${API_BASE}/api/admin/imports/${id}`, {
    headers: getAuthHeaders(),
  })
  await throwIfError(res)
  return res.json() as Promise<ImportDetailResponse>
}

// ────────────────────────────────────────────
// Mapper
// ────────────────────────────────────────────

/** Convert a backend ImportWorkerApi row into a frontend Worker. */
export function apiWorkerToWorker(w: ImportWorkerApi): Worker {
  const monthlyMinutes = Object.fromEntries(
    MONTHS.map((m) => [
      m.key,
      w.monthlyMinutes?.[m.label.toLowerCase()] ??
        w.monthlyMinutes?.[m.key] ??
        0,
    ]),
  ) as MonthlyMinutes

  return {
    id: w.employeeCode,
    firstName: w.firstName,
    middleName: w.middleName ?? '',
    lastName: w.lastName,
    monthlyMinutes,
  }
}
