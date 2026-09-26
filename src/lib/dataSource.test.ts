import { afterEach, describe, expect, it, vi } from 'vitest'
import { getActiveRepository, type ImportSelection } from './dataSource'
import { createLocalStorageRepository } from './localStorageRepository'
import { STORAGE_KEY } from './storage'

const selection: ImportSelection = {
  workers: [
    {
      id: 'SMP-1',
      lastName: 'Aguilar',
      firstName: 'Nadia',
      middleName: '',
      monthlyMinutes: {
        jan: 12,
        feb: 0,
        mar: 0,
        apr: 0,
        may: 0,
        jun: 0,
        jul: 0,
        aug: 0,
        sep: 0,
        oct: 0,
        nov: 0,
        dec: 0,
      },
    },
  ],
  fileName: 'sample-attendance-2026.xlsx',
  sheetName: 'Workers',
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getActiveRepository', () => {
  it('returns the same repository instance on every call', () => {
    expect(getActiveRepository()).toBe(getActiveRepository())
  })
})

describe('createLocalStorageRepository', () => {
  it('resolves demo data when nothing is stored', async () => {
    const outcome = await createLocalStorageRepository().load()

    expect(outcome.source).toBe('demo')
    expect(outcome.workers.length).toBeGreaterThan(0)
  })

  it('applies an import and persists it', async () => {
    const repository = createLocalStorageRepository()

    const outcome = await repository.applyImport(selection)

    expect(outcome.persisted).toBe(true)
    expect(outcome.data.source).toBe('upload')
    expect(outcome.data.fileName).toBe('sample-attendance-2026.xlsx')
    expect(outcome.data.sheetName).toBe('Workers')
    expect(outcome.data.workers).toEqual(selection.workers)
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull()
  })

  it('reads imported data back on the next load', async () => {
    const repository = createLocalStorageRepository()
    await repository.applyImport(selection)

    const reloaded = await createLocalStorageRepository().load()

    expect(reloaded.source).toBe('upload')
    expect(reloaded.workers).toEqual(selection.workers)
  })

  it('restores demo data and persists it', async () => {
    const repository = createLocalStorageRepository()
    await repository.applyImport(selection)

    const outcome = await repository.restoreDemo()

    expect(outcome.persisted).toBe(true)
    expect(outcome.data.source).toBe('demo')
    expect((await repository.load()).source).toBe('demo')
  })

  it('reports a failed save without losing the imported data', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })

    const outcome = await createLocalStorageRepository().applyImport(selection)

    expect(outcome.persisted).toBe(false)
    expect(outcome.data.workers).toEqual(selection.workers)
  })
})
