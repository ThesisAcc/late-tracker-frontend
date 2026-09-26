import { useEffect, useRef } from 'react'
import { MonthlyBreakdown } from '../../components/MonthlyBreakdown'
import {
  getWorkerFullName,
  getWorkerInitials,
  getWorkerPeriodTotal,
} from '../../lib/calculations'
import type { MonthKey } from '../../lib/months'
import type { Worker } from '../../lib/types'

interface WorkerDetailDialogProps {
  worker: Worker
  selectedMonth: MonthKey
  onMonthChange: (month: MonthKey) => void
  onClose: () => void
}

const numberFormatter = new Intl.NumberFormat('en-US')

export function WorkerDetailDialog({
  worker,
  selectedMonth,
  onMonthChange,
  onClose,
}: WorkerDetailDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    triggerRef.current = document.activeElement as HTMLElement | null

    if (dialog && !dialog.open) {
      dialog.showModal()
    }

    closeButtonRef.current?.focus()

    return () => {
      if (dialog?.open) {
        dialog.close()
      }

      triggerRef.current?.focus()
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="worker-dialog"
      aria-labelledby="worker-detail-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="worker-dialog__surface">
        <div className="dialog-heading">
          <div className="worker-cell worker-cell--large">
            <span className="worker-avatar" aria-hidden="true">
              {getWorkerInitials(worker)}
            </span>
            <span>
              <p className="eyebrow">Worker breakdown</p>
              <h2 id="worker-detail-title">{getWorkerFullName(worker)}</h2>
              <small>{worker.id}</small>
            </span>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="icon-button"
            aria-label="Close worker details"
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <p className="worker-dialog__summary">
          {numberFormatter.format(
            worker.monthlyMinutes[selectedMonth],
          )}{' '}
          minutes in the selected month ·{' '}
          {numberFormatter.format(getWorkerPeriodTotal(worker))} minutes across
          12 months
        </p>

        <MonthlyBreakdown
          totals={worker.monthlyMinutes}
          selectedMonth={selectedMonth}
          onSelect={onMonthChange}
        />

        <div className="dialog-actions">
          <p>Select a month in the chart to update the dashboard. Press Escape to close.</p>
        </div>
      </div>
    </dialog>
  )
}
