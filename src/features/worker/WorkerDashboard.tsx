import { EmptyState } from '../../components/EmptyState'
import { MetricCard } from '../../components/MetricCard'
import { MonthlyBreakdown } from '../../components/MonthlyBreakdown'
import { getWorkerPeriodTotal } from '../../lib/calculations'
import { getMonthDefinition, MONTHS, type MonthKey } from '../../lib/months'
import type { Worker } from '../../lib/types'

interface WorkerDashboardProps {
  workers: Worker[]
  selectedWorkerId: string
  selectedMonth: MonthKey
  onWorkerChange: (workerId: string) => void
  onMonthChange: (month: MonthKey) => void
}

const numberFormatter = new Intl.NumberFormat('en-US')

export function WorkerDashboard({
  workers,
  selectedWorkerId,
  selectedMonth,
  onWorkerChange,
  onMonthChange,
}: WorkerDashboardProps) {
  if (workers.length === 0) {
    return (
      <div className="dashboard-stack">
        <section className="page-heading" aria-labelledby="worker-title">
          <div>
            <p className="eyebrow">Worker view</p>
            <h1 id="worker-title">My late records</h1>
            <p>Records stay read-only and appear after a manager imports a workbook.</p>
          </div>
        </section>
        <EmptyState
          title="No worker records yet"
          message="A manager needs to import an Excel workbook before worker records become available."
        />
      </div>
    )
  }

  const worker =
    workers.find((item) => item.id === selectedWorkerId) ?? workers[0]
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
          <p>Review monthly totals imported by a manager. Records are read-only.</p>
        </div>
        <div className="heading-controls">
          <label className="field field--compact">
            <span>Worker</span>
            <select
              value={worker.id}
              onChange={(event) => onWorkerChange(event.target.value)}
            >
              {workers.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.lastName}, {item.firstName}
                </option>
              ))}
            </select>
          </label>
          <label className="field field--compact">
            <span>Month</span>
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
