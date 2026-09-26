import type {
  AttendanceRepository,
  ImportSelection,
  RepositoryOutcome,
} from './dataSource'
import { createDemoData } from './demoData'
import { loadTrackerData, saveTrackerData } from './storage'
import type { TrackerData } from './types'

function saveOutcome(build: () => TrackerData): Promise<RepositoryOutcome> {
  const data = build()

  try {
    saveTrackerData(data)

    return Promise.resolve({ data, persisted: true })
  } catch {
    return Promise.resolve({ data, persisted: false })
  }
}

export function createLocalStorageRepository(): AttendanceRepository {
  return {
    load(): Promise<TrackerData> {
      return Promise.resolve(loadTrackerData())
    },

    applyImport(selection: ImportSelection): Promise<RepositoryOutcome> {
      return saveOutcome(() => ({
        version: 1,
        source: 'upload',
        fileName: selection.fileName,
        sheetName: selection.sheetName,
        importedAt: new Date().toISOString(),
        workers: selection.workers,
      }))
    },

    restoreDemo(): Promise<RepositoryOutcome> {
      return saveOutcome(createDemoData)
    },
  }
}
