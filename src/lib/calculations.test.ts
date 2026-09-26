import { describe, expect, it } from 'vitest'
import {
  createEmptyMonthlyMinutes,
  getLargestMonthTotal,
  getManagerSummary,
  getNiceAxisMax,
  getTeamMonthlyTotals,
  getWorkerFullName,
  getWorkerInitials,
  getWorkerPeriodTotal,
  sortWorkersByName,
} from './calculations'
import type { Worker } from './types'

function makeWorker(overrides: Partial<Worker> = {}): Worker {
  return {
    id: 'A-1',
    firstName: 'Avery',
    middleName: '',
    lastName: 'Reyes',
    monthlyMinutes: createEmptyMonthlyMinutes(),
    ...overrides,
  }
}

describe('createEmptyMonthlyMinutes', () => {
  it('returns zero for all twelve months', () => {
    const totals = createEmptyMonthlyMinutes()
    expect(Object.values(totals)).toEqual(new Array(12).fill(0))
  })
})

describe('getWorkerPeriodTotal', () => {
  it('sums every month', () => {
    const worker = makeWorker({
      monthlyMinutes: { ...createEmptyMonthlyMinutes(), jan: 10, mar: 5, dec: 7 },
    })
    expect(getWorkerPeriodTotal(worker)).toBe(22)
  })

  it('returns zero when no month has minutes', () => {
    expect(getWorkerPeriodTotal(makeWorker())).toBe(0)
  })
})

describe('getTeamMonthlyTotals', () => {
  it('sums each month across workers', () => {
    const first = makeWorker({
      id: 'A-1',
      monthlyMinutes: { ...createEmptyMonthlyMinutes(), jan: 10, feb: 3 },
    })
    const second = makeWorker({
      id: 'A-2',
      monthlyMinutes: { ...createEmptyMonthlyMinutes(), jan: 4, feb: 2 },
    })

    const totals = getTeamMonthlyTotals([first, second])

    expect(totals.jan).toBe(14)
    expect(totals.feb).toBe(5)
    expect(totals.mar).toBe(0)
  })

  it('returns all zeros for an empty team', () => {
    expect(Object.values(getTeamMonthlyTotals([]))).toEqual(
      new Array(12).fill(0),
    )
  })
})

describe('getManagerSummary', () => {
  it('reports month total, late count, highest worker and average', () => {
    const first = makeWorker({
      id: 'A-1',
      firstName: 'Avery',
      lastName: 'Reyes',
      monthlyMinutes: { ...createEmptyMonthlyMinutes(), jan: 30 },
    })
    const second = makeWorker({
      id: 'A-2',
      firstName: 'Jordan',
      lastName: 'Bautista',
      monthlyMinutes: { ...createEmptyMonthlyMinutes(), jan: 10 },
    })
    const clean = makeWorker({
      id: 'A-3',
      firstName: 'Morgan',
      lastName: 'Santos',
    })

    const summary = getManagerSummary([first, second, clean], 'jan')

    expect(summary.monthTotal).toBe(40)
    expect(summary.lateWorkerCount).toBe(2)
    expect(summary.highestWorker?.id).toBe('A-1')
    expect(summary.averageLateMinutes).toBe(20)
  })

  it('reports zero average when nobody was late', () => {
    const summary = getManagerSummary([makeWorker()], 'jan')

    expect(summary.monthTotal).toBe(0)
    expect(summary.lateWorkerCount).toBe(0)
    expect(summary.highestWorker).toBeNull()
    expect(summary.averageLateMinutes).toBe(0)
  })
})

describe('name helpers', () => {
  it('joins first, middle and last name in order', () => {
    expect(
      getWorkerFullName(
        makeWorker({ firstName: 'Avery', middleName: 'Ann', lastName: 'Reyes' }),
      ),
    ).toBe('Avery Ann Reyes')
  })

  it('omits a missing middle name', () => {
    expect(getWorkerFullName(makeWorker({ middleName: '' }))).toBe('Avery Reyes')
  })

  it('builds uppercase initials from first and last name', () => {
    expect(getWorkerInitials(makeWorker())).toBe('AR')
  })
})

describe('sortWorkersByName', () => {
  it('sorts by full name without mutating the input', () => {
    const workers = [
      makeWorker({ id: 'A-1', firstName: 'Zoe', lastName: 'Adams' }),
      makeWorker({ id: 'A-2', firstName: 'Avery', lastName: 'Reyes' }),
    ]
    const sorted = sortWorkersByName(workers)

    expect(sorted.map((worker) => worker.id)).toEqual(['A-2', 'A-1'])
    expect(workers.map((worker) => worker.id)).toEqual(['A-1', 'A-2'])
  })
})

describe('getLargestMonthTotal', () => {
  it('finds the busiest month', () => {
    const totals = {
      ...createEmptyMonthlyMinutes(),
      mar: 4,
      apr: 41,
      may: 12,
    }
    expect(getLargestMonthTotal(totals)).toBe(41)
  })
})

describe('getNiceAxisMax', () => {
  it('rounds a busy month up to a readable axis top', () => {
    expect(getNiceAxisMax(41)).toBe(50)
    expect(getNiceAxisMax(240)).toBe(250)
  })

  it('keeps an already-nice value unchanged', () => {
    expect(getNiceAxisMax(100)).toBe(100)
    expect(getNiceAxisMax(50)).toBe(50)
  })

  it('always covers the source value', () => {
    for (const value of [1, 7, 9, 13, 99, 101, 432, 987, 1234]) {
      expect(getNiceAxisMax(value)).toBeGreaterThanOrEqual(value)
    }
  })

  it('falls back to whole-minute ticks for empty or invalid data', () => {
    expect(getNiceAxisMax(0)).toBe(5)
    expect(getNiceAxisMax(-10)).toBe(5)
    expect(getNiceAxisMax(Number.NaN)).toBe(5)
  })

  it('honours a custom tick count', () => {
    expect(getNiceAxisMax(41, 4)).toBe(80)
  })
})
