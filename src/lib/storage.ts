import { createDemoData } from './demoData'
import { MONTH_KEYS } from './months'
import type { TrackerData, Worker } from './types'

export const STORAGE_KEY = 'latetrack-data-v1'

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

function getDefaultStorage(): StorageLike | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function isWorker(value: unknown): value is Worker {
  if (!value || typeof value !== 'object') {
    return false
  }

  const worker = value as Partial<Worker>
  const validText = ['id', 'lastName', 'firstName', 'middleName'].every(
    (key) => typeof worker[key as keyof Worker] === 'string',
  )
  const validMonths =
    !!worker.monthlyMinutes &&
    MONTH_KEYS.every((month) => {
      const minutes = worker.monthlyMinutes?.[month]
      return (
        typeof minutes === 'number' &&
        Number.isFinite(minutes) &&
        Number.isInteger(minutes) &&
        minutes >= 0
      )
    })

  return validText && validMonths
}

function isTrackerData(value: unknown): value is TrackerData {
  if (!value || typeof value !== 'object') {
    return false
  }

  const data = value as Partial<TrackerData>
  const validSource =
    data.source === 'demo' || data.source === 'upload' || data.source === 'server'
  const uniqueIds = new Set(
    Array.isArray(data.workers)
      ? data.workers.map((worker) => worker.id.toLowerCase())
      : [],
  )

  return (
    data.version === 1 &&
    validSource &&
    Array.isArray(data.workers) &&
    data.workers.every(isWorker) &&
    uniqueIds.size === data.workers.length
  )
}

export function loadTrackerData(storage = getDefaultStorage()): TrackerData {
  if (!storage) {
    return createDemoData()
  }

  try {
    const stored = storage.getItem(STORAGE_KEY)
    if (!stored) {
      return createDemoData()
    }

    const parsed: unknown = JSON.parse(stored)
    return isTrackerData(parsed) ? parsed : createDemoData()
  } catch {
    return createDemoData()
  }
}

export function saveTrackerData(
  data: TrackerData,
  storage = getDefaultStorage(),
): void {
  if (!storage) {
    throw new Error('Browser storage is unavailable.')
  }

  storage.setItem(STORAGE_KEY, JSON.stringify(data))
}
