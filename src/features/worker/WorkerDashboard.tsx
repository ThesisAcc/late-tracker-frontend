import { useEffect, useState } from 'react'
import { EmptyState } from '../../components/EmptyState'
import { MetricCard } from '../../components/MetricCard'
import { MonthlyBreakdown } from '../../components/MonthlyBreakdown'
import { getWorkerPeriodTotal } from '../../lib/calculations'
import { getMonthDefinition, MONTHS, type MonthKey } from '../../lib/months'
import type { Worker, MonthlyMinutes } from '../../lib/types'
import { fetchMyDashboard, type EmployeeDashboardResponse } from '../../lib/dashboardApi'

interface WorkerDashboardProps {
  selectedMonth: MonthKey
  onMonthChange: (month: MonthKey) => void
}

const numberFormatter = new Intl.NumberFormat('en-US')

function dashboardResponseToWorker(dashboard: EmployeeDashboardResponse): Worker {
  const monthlyMinutes: MonthlyMinutes = {} as MonthlyMinutes
  for (const m of MONTHS) {
    monthlyMinutes[m.key] = 0
  }

  for (const item of dashboard.monthlyBreakdown) {
    if (item.month >= 1 && item.month <= 12) {
      const monthKey = MONTHS[item.month - 1]?.key
      if (monthKey) {
        monthlyMinutes[monthKey] = item.minutesLate
      }
    }
  }

  return {
    id: dashboard.employee.employeeCode,
    firstName: dashboard.employee.firstName,
    middleName: dashboard.employee.middleName ?? '',
    lastName: dashboard.employee.lastName,
    monthlyMinutes,
  }
}

export function WorkerDashboard({
  selectedMonth,
  onMonthChange,
}: WorkerDashboardProps) {
  const [worker, setWorker] = useState<Worker | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      try {
        setIsLoading(true)
        setError(null)
        const dashboard = await fetchMyDashboard()
        if (!cancelled) {
          setWorker(dashboardResponseToWorker(dashboard))
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      cancelled = true
    }
  }, [])

  if (isLoading) {
    return (
      <div className="dashboard-stack">
        <section className="page-heading" aria-labelledby="worker-title">
          <div>
            <p className="eyebrow">Worker view</p>
            <h1 id="worker-title">My late records</h1>
          </div>
        </section>
        <div className="loading-state" role="status" aria-busy="true">
          <span className="loading-spinner" aria-hidden="true" />
          <p>Loading your records...</p>
        </div>
      </div>
    )
  }

  if (error || !worker) {
    return (
      <div className="dashboard-stack">
        <section className="page-heading" aria-labelledby="worker-title">
          <div>
            <p className="eyebrow">Worker view</p>
            <h1 id="worker-title">My late records</h1>
          </div>
        </section>
        <EmptyState
          title="Unable to load records"
          message={error || 'Your attendance records could not be loaded.'}
        />
      </div>
    )
  }

  const month = getMonthDefinition(selectedMonth)
  const monthTotal = worker.monthlyMinutes[selectedMonth]
  const periodTotal = getWorkerPeriodTotal(worker)
  const monthsWithLateness = MONTHS.filter(
    (item) => worker.monthlyMinutes[item.key] > 0,
  ).length

  return (
    <div className="dashboard-stack">
      <section className="page-heading" aria-labelledby="worker-title">
        <div>
          <p className="eyebrow">Worker view</p>
          <h1 id="worker-title">My late records</h1>
          <p>Your monthly totals imported by a manager. Records are read-only.</p>
        </div>
        <div className="heading-controls">
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
        </div>
      </section>

      <section className="worker-identity" aria-label="Selected worker">
        <div>
          <p className="eyebrow">Employee record</p>
          <h2>{worker.id}</h2>
          <p>
            {[worker.lastName, worker.firstName, worker.middleName]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <span
          className={`status-pill ${monthTotal > 0 ? 'status-pill--late' : 'status-pill--clear'}`}
        >
          {monthTotal > 0 ? 'Late minutes recorded' : 'No lateness recorded'}
        </span>
      </section>

      <section className="metric-grid metric-grid--worker" aria-label="Worker summary">
        <MetricCard
          label={`${month.shortLabel} total`}
          value={`${numberFormatter.format(monthTotal)} min`}
          detail="Selected reporting month"
          tone={monthTotal > 0 ? 'danger' : 'default'}
        />
        <MetricCard
          label="12-month total"
          value={`${numberFormatter.format(periodTotal)} min`}
          detail="Across all imported months"
        />
        <MetricCard
          label="Months with lateness"
          value={numberFormatter.format(monthsWithLateness)}
          detail="Months with a value above zero"
          tone={monthsWithLateness > 0 ? 'warning' : 'default'}
        />
      </section>

      <section className="panel" aria-labelledby="worker-breakdown-title">
        <div className="panel__heading">
          <div>
            <p className="eyebrow">Personal breakdown</p>
            <h2 id="worker-breakdown-title">Late minutes by month</h2>
          </div>
          <p>Select a month to update the summary.</p>
        </div>
        <MonthlyBreakdown
          totals={worker.monthlyMinutes}
          selectedMonth={selectedMonth}
          onSelect={onMonthChange}
        />
      </section>
    </div>
  )
}