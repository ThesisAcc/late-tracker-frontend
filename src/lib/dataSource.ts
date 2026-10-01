import { getAuthToken } from './auth'
import { createLocalStorageRepository } from './localStorageRepository'
import { createServerRepository } from './serverRepository'
import type { TrackerData, Worker } from './types'

export interface ImportSelection {
  workers: Worker[]
  fileName: string
  sheetName: string
  file?: File
  year?: number
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
const serverRepository = createServerRepository()

export function getActiveRepository(): AttendanceRepository {
  return getAuthToken() ? serverRepository : localRepository
}

export const SAVE_WARNING =
  'Changes are available for this session, but they could not be saved.'
