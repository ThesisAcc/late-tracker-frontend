import type { MonthKey } from './months'

export type MonthlyMinutes = Record<MonthKey, number>

export interface Worker {
  id: string
  lastName: string
  firstName: string
  middleName: string
  monthlyMinutes: MonthlyMinutes
}

export type TrackerSource = 'demo' | 'upload' | 'server'

export interface TrackerData {
  version: 1
  source: TrackerSource
  fileName?: string
  sheetName?: string
  importedAt?: string
  workers: Worker[]
}

export interface ImportIssue {
  row: number | null
  column: string
  message: string
}

export interface SheetPreview {
  name: string
  workers: Worker[]
  errors: ImportIssue[]
  warnings: ImportIssue[]
}

export interface WorkbookPreview {
  fileName: string
  sheets: SheetPreview[]
}
