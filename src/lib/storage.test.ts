import { describe, expect, it, vi } from 'vitest'
import { createDemoData } from './demoData'
import { loadTrackerData, saveTrackerData, STORAGE_KEY } from './storage'
import type { TrackerData } from './types'

function createMemoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
}

describe('loadTrackerData', () => {
  it('returns demo data when storage is empty', () => {
    const data = loadTrackerData(createMemoryStorage())

    expect(data.source).toBe('demo')
    expect(data.workers.length).toBeGreaterThan(0)
  })

  it('restores saved data', () => {
    const storage = createMemoryStorage()
    const saved: TrackerData = { version: 1, source: 'upload', workers: [] }
    storage.setItem(STORAGE_KEY, JSON.stringify(saved))

    expect(loadTrackerData(storage)).toEqual(saved)
  })

  it('accepts records synced from a server', () => {
    const storage = createMemoryStorage()
    const saved: TrackerData = {
      version: 1,
      source: 'server',
      workers: createDemoData().workers,
    }
    storage.setItem(STORAGE_KEY, JSON.stringify(saved))

    expect(loadTrackerData(storage).source).toBe('server')
  })

  it('falls back to demo data for invalid JSON', () => {
    const storage = createMemoryStorage()
    storage.setItem(STORAGE_KEY, '{not json')

    expect(loadTrackerData(storage).source).toBe('demo')
  })

  it('falls back to demo data when a worker has invalid minutes', () => {
    const storage = createMemoryStorage()
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        source: 'upload',
        workers: [
          {
            id: 'A-1',
            firstName: 'Avery',
            middleName: '',
            lastName: 'Reyes',
            monthlyMinutes: { jan: -1 },
          },
        ],
      }),
    )

    expect(loadTrackerData(storage).source).toBe('demo')
  })

  it('falls back to demo data when a stored value is not an integer', () => {
    const storage = createMemoryStorage()
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        source: 'upload',
        workers: [
          {
            ...createDemoData().workers[0],
            monthlyMinutes: { ...createDemoData().workers[0].monthlyMinutes, jan: 1.5 },
          },
        ],
      }),
    )

    expect(loadTrackerData(storage).source).toBe('demo')
  })

  it('falls back to demo data on a storage read error', () => {
    const storage = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {},
    }

    expect(loadTrackerData(storage).source).toBe('demo')
  })

  it('returns demo data when no storage is available', () => {
    expect(loadTrackerData(null).source).toBe('demo')
  })
})

describe('saveTrackerData', () => {
  it('writes under the versioned storage key', () => {
    const storage = createMemoryStorage()
    const setItem = vi.spyOn(storage, 'setItem')
    const data = createDemoData()

    saveTrackerData(data, storage)

    expect(setItem).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(data))
  })

  it('throws when storage is unavailable', () => {
    expect(() => saveTrackerData(createDemoData(), null)).toThrow(
      'Browser storage is unavailable.',
    )
  })
})
