import { createLocalStorageRepository } from './localStorageRepository'
import type { TrackerData, Worker } from './types'

export interface ImportSelection {
  workers: Worker[]
  fileName: string
  sheetName: string
}

export interface RepositoryOutcome {
  data: TrackerData
  persisted: boolean
}

export interface AttendanceRepository {
  load(): Promise<TrackerData>
  applyImport(selection: ImportSelection): Promise<RepositoryOutcome>
  restoreDemo(): Promise<RepositoryOutcome>
}

const localRepository = createLocalStorageRepository()

export function getActiveRepository(): AttendanceRepository {
  return localRepository
}

export const SAVE_WARNING =
  'Changes are available for this session, but they could not be saved.'
