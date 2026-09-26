import { MONTHS, MONTH_KEYS, type MonthKey } from './months'
import type { MonthlyMinutes, Worker } from './types'

export function createEmptyMonthlyMinutes(): MonthlyMinutes {
  return {
    jan: 0,
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
  }
}

export function getWorkerPeriodTotal(worker: Worker): number {
  return MONTH_KEYS.reduce(
    (total, month) => total + worker.monthlyMinutes[month],
    0,
  )
}

export function getTeamMonthlyTotals(workers: Worker[]): MonthlyMinutes {
  return MONTH_KEYS.reduce<MonthlyMinutes>(
    (totals, month) => {
      totals[month] = workers.reduce(
        (total, worker) => total + worker.monthlyMinutes[month],
        0,
      )
      return totals
    },
    createEmptyMonthlyMinutes(),
  )
}

export function getManagerSummary(workers: Worker[], month: MonthKey) {
  const monthTotal = workers.reduce(
    (total, worker) => total + worker.monthlyMinutes[month],
    0,
  )
  const lateWorkers = workers.filter(
    (worker) => worker.monthlyMinutes[month] > 0,
  )
  const highestWorker = lateWorkers.reduce<Worker | null>(
    (highest, worker) =>
      !highest || worker.monthlyMinutes[month] > highest.monthlyMinutes[month]
        ? worker
        : highest,
    null,
  )
  const periodTotal = workers.reduce(
    (total, worker) => total + getWorkerPeriodTotal(worker),
    0,
  )

  return {
    monthTotal,
    lateWorkerCount: lateWorkers.length,
    highestWorker,
    averageLateMinutes:
      lateWorkers.length === 0
        ? 0
        : Math.round(monthTotal / lateWorkers.length),
    periodTotal,
  }
}

export function getWorkerFullName(worker: Worker): string {
  return [worker.firstName, worker.middleName, worker.lastName]
    .filter(Boolean)
    .join(' ')
}

export function getWorkerInitials(worker: Worker): string {
  return `${worker.firstName.charAt(0)}${worker.lastName.charAt(0)}`.toUpperCase()
}

export function sortWorkersByName(workers: Worker[]): Worker[] {
  return [...workers].sort((first, second) =>
    getWorkerFullName(first).localeCompare(getWorkerFullName(second)),
  )
}

export function getLargestMonthTotal(totals: MonthlyMinutes): number {
  return Math.max(...MONTHS.map((month) => totals[month.key]))
}

export function getNiceAxisMax(value: number, tickCount = 5): number {
  if (!Number.isFinite(value) || value <= 0) {
    return tickCount
  }

  const roughStep = value / tickCount
  const magnitude = 10 ** Math.floor(Math.log10(roughStep))
  const normalized = roughStep / magnitude
  const niceNormalized =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10

  return Math.max(niceNormalized * magnitude * tickCount, tickCount)
}
