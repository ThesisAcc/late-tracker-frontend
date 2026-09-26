import { useState } from 'react'
import { EmptyState } from '../../components/EmptyState'
import { MetricCard } from '../../components/MetricCard'
import { MonthlyBreakdown } from '../../components/MonthlyBreakdown'
import {
  getManagerSummary,
  getTeamMonthlyTotals,
  getWorkerFullName,
  getWorkerInitials,
  getWorkerPeriodTotal,
  sortWorkersByName,
} from '../../lib/calculations'
import { getMonthDefinition, MONTHS, type MonthKey } from '../../lib/months'
import type { Worker } from '../../lib/types'
import { WorkerDetailDialog } from './WorkerDetailDialog'

interface ManagerDashboardProps {
  workers: Worker[]
  selectedMonth: MonthKey
  onMonthChange: (month: MonthKey) => void
  onOpenImport: () => void
}

type SortKey = 'name' | 'month' | 'period'
type SortDirection = 'ascending' | 'descending'

const numberFormatter = new Intl.NumberFormat('en-US')

export function ManagerDashboard({
  workers,
  selectedMonth,
  onMonthChange,
  onOpenImport,
}: ManagerDashboardProps) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('month')
  const [sortDirection, setSortDirection] =
    useState<SortDirection>('descending')
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null)

  if (workers.length === 0) {
    return (
      <div className="dashboard-stack">
        <section className="page-heading" aria-labelledby="manager-title">
          <div>
            <p className="eyebrow">Manager overview</p>
            <h1 id="manager-title">Lateness dashboard</h1>
            <p>Import a workbook to review monthly late minutes.</p>
          </div>
        </section>
        <EmptyState
          title="No worker data yet"
          message="Import an Excel workbook or download the template to add monthly late-minute totals."
          actionLabel="Import Excel"
          onAction={onOpenImport}
        />
      </div>
    )
  }

  const month = getMonthDefinition(selectedMonth)
  const summary = getManagerSummary(workers, selectedMonth)
  const monthlyTotals = getTeamMonthlyTotals(workers)
  const normalizedSearch = search.trim().toLowerCase()
  const filteredWorkers = sortWorkersByName(
    workers.filter((worker) => {
      if (!normalizedSearch) {
        return true
      }
      return [
        worker.id,
        worker.firstName,
        worker.middleName,
        worker.lastName,
        getWorkerFullName(worker),
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch)
    }),
  )
  const sortedWorkers = [...filteredWorkers].sort((first, second) => {
    let comparison: number

    if (sortKey === 'name') {
      comparison = getWorkerFullName(first).localeCompare(
        getWorkerFullName(second),
      )
    } else if (sortKey === 'month') {
      comparison =
        first.monthlyMinutes[selectedMonth] -
        second.monthlyMinutes[selectedMonth]
    } else {
      comparison = getWorkerPeriodTotal(first) - getWorkerPeriodTotal(second)
    }

    return sortDirection === 'ascending' ? comparison : -comparison
  })
  const selectedWorker =
    workers.find((worker) => worker.id === selectedWorkerId) ?? null
  const highestWorkerDetail = summary.highestWorker
    ? `${getWorkerFullName(summary.highestWorker)} · ${numberFormatter.format(
        summary.highestWorker.monthlyMinutes[selectedMonth],
      )} min`
    : 'No late minutes recorded'

  function handleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) =>
        current === 'ascending' ? 'descending' : 'ascending',
      )
    } else {
      setSortKey(nextKey)
      setSortDirection(nextKey === 'name' ? 'ascending' : 'descending')
    }
  }

  return (
    <div className="dashboard-stack">
      <section className="page-heading" aria-labelledby="manager-title">
        <div>
          <p className="eyebrow">Manager overview</p>
          <h1 id="manager-title">Lateness dashboard</h1>
          <p>
            Review monthly late minutes across {workers.length} workers. Values
            come from imported monthly totals.
          </p>
        </div>
        <label className="field field--compact">
          <span>Reporting month</span>
          <select
            value={selectedMonth}
            onChange={(event) =>
              onMonthChange(event.target.value as MonthKey)
            }
          >
            {MONTHS.map((item) => (
              <option value={item.key} key={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="metric-grid" aria-label={`${month.label} summary`}>
        <MetricCard
          label={`${month.shortLabel} team total`}
          value={`${numberFormatter.format(summary.monthTotal)} min`}
          detail="Combined late minutes"
          tone="danger"
        />
        <MetricCard
          label="Workers with lateness"
          value={numberFormatter.format(summary.lateWorkerCount)}
          detail={`of ${workers.length} workers`}
          tone="warning"
        />
        <MetricCard
          label="Highest worker total"
          value={
            summary.highestWorker
              ? `${numberFormatter.format(
                  summary.highestWorker.monthlyMinutes[selectedMonth],
                )} min`
              : '0 min'
          }
          detail={highestWorkerDetail}
        />
        <MetricCard
          label="12-month team total"
          value={`${numberFormatter.format(summary.periodTotal)} min`}
          detail={`${numberFormatter.format(summary.averageLateMinutes)} min average among late workers`}
        />
      </section>

      <section className="panel" aria-labelledby="team-trend-title">
        <div className="panel__heading">
          <div>
            <p className="eyebrow">Team trend</p>
            <h2 id="team-trend-title">Monthly late minutes</h2>
          </div>
          <p>Select a month to update the dashboard.</p>
        </div>
        <MonthlyBreakdown
          totals={monthlyTotals}
          selectedMonth={selectedMonth}
          onSelect={onMonthChange}
        />
      </section>

      <section className="panel" aria-labelledby="workers-title">
        <div className="panel__heading panel__heading--wrap">
          <div>
            <p className="eyebrow">Worker records</p>
            <h2 id="workers-title">Monthly totals</h2>
          </div>
          <label className="search-field">
            <span className="sr-only">Search workers</span>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
            </svg>
            <input
              type="search"
              placeholder="Search name or ID"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>

        {sortedWorkers.length === 0 ? (
          <div className="table-empty">No workers match “{search}”.</div>
        ) : (
          <div className="table-wrap">
            <table className="worker-table">
              <caption className="sr-only">
                Worker late-minute totals for {month.label}
              </caption>
              <thead>
                <tr>
                  <th
                    scope="col"
                    aria-sort={
                      sortKey === 'name' ? sortDirection : 'none'
                    }
                  >
                    <button type="button" onClick={() => handleSort('name')}>
                      Worker
                    </button>
                  </th>
                  <th scope="col">Status</th>
                  <th
                    scope="col"
                    aria-sort={
                      sortKey === 'month' ? sortDirection : 'none'
                    }
                  >
                    <button type="button" onClick={() => handleSort('month')}>
                      {month.shortLabel} total
                    </button>
                  </th>
                  <th
                    scope="col"
                    aria-sort={
                      sortKey === 'period' ? sortDirection : 'none'
                    }
                  >
                    <button type="button" onClick={() => handleSort('period')}>
                      12-month total
                    </button>
                  </th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedWorkers.map((worker) => {
                  const workerMonthTotal =
                    worker.monthlyMinutes[selectedMonth]
                  const hasLateness = workerMonthTotal > 0

                  return (
                    <tr key={worker.id}>
                      <td data-label="Worker">
                        <div className="worker-cell">
                          <span className="worker-avatar" aria-hidden="true">
                            {getWorkerInitials(worker)}
                          </span>
                          <span>
                            <strong>{getWorkerFullName(worker)}</strong>
                            <small>{worker.id}</small>
                          </span>
                        </div>
                      </td>
                      <td data-label="Status">
                        <span
                          className={`status-pill ${hasLateness ? 'status-pill--late' : 'status-pill--clear'}`}
                        >
                          {hasLateness ? 'Late recorded' : 'No lateness'}
                        </span>
                      </td>
                      <td data-label={`${month.shortLabel} total`}>
                        <strong>{numberFormatter.format(workerMonthTotal)} min</strong>
                      </td>
                      <td data-label="12-month total">
                        {numberFormatter.format(getWorkerPeriodTotal(worker))} min
                      </td>
                      <td data-label="Action">
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => setSelectedWorkerId(worker.id)}
                          aria-haspopup="dialog"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedWorker ? (
        <WorkerDetailDialog
          worker={selectedWorker}
          selectedMonth={selectedMonth}
          onMonthChange={onMonthChange}
          onClose={() => setSelectedWorkerId(null)}
        />
      ) : null}
    </div>
  )
}
