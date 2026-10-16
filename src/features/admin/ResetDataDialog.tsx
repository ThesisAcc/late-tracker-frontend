import { useEffect, useRef, useState } from 'react'
import {
  downloadResetBackup,
  executeReset,
  fetchResetPreview,
  type ResetPreviewResponse,
} from '../../lib/resetApi'

interface ResetDataDialogProps {
  onClose: () => void
  onResetComplete?: () => void
}

export function ResetDataDialog({ onClose, onResetComplete }: ResetDataDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  const [preview, setPreview] = useState<ResetPreviewResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isResetting, setIsResetting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmInput, setConfirmInput] = useState('')
  const [backupDownloaded, setBackupDownloaded] = useState(false)
  const [resetDone, setResetDone] = useState(false)

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

  useEffect(() => {
    let isCurrent = true
    setIsLoading(true)
    setError(null)

    fetchResetPreview()
      .then((data) => {
        if (isCurrent) {
          setPreview(data)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (isCurrent) {
          setError(
            err instanceof Error ? err.message : 'Failed to load reset preview.',
          )
          setIsLoading(false)
        }
      })

    return () => {
      isCurrent = false
    }
  }, [])

  function handleDownloadBackup() {
    if (!preview) return
    downloadResetBackup(preview)
    setBackupDownloaded(true)
  }

  async function handleConfirmReset() {
    if (confirmInput !== 'RESET_NON_ADMIN_DATA' || isResetting) {
      return
    }

    setIsResetting(true)
    setError(null)
    try {
      await executeReset()
      setResetDone(true)
      onResetComplete?.()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to execute reset operation.',
      )
    } finally {
      setIsResetting(false)
    }
  }

  const isConfirmed = confirmInput === 'RESET_NON_ADMIN_DATA'

  return (
    <dialog
      ref={dialogRef}
      className="reset-dialog"
      aria-labelledby="reset-dialog-title"
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
      <div className="reset-dialog__surface">
        <div className="dialog-heading">
          <div>
            <p className="eyebrow eyebrow--danger">Administration</p>
            <h2 id="reset-dialog-title">Reset Application Data</h2>
            <p>Delete all non-admin workforce records, attendance logs, and imports.</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        {error ? (
          <div className="alert alert--error" role="alert" style={{ margin: '16px 0' }}>
            <span>{error}</span>
            <button
              type="button"
              className="text-button"
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </div>
        ) : null}

        {resetDone ? (
          <div className="reset-success-view">
            <div className="alert alert--success" role="alert">
              <strong>Success:</strong> Application data has been reset. All non-admin records have been cleared.
            </div>
            <div className="dialog-actions" style={{ marginTop: '24px' }}>
              <div style={{ marginLeft: 'auto' }}>
                <button
                  type="button"
                  className="button button--primary"
                  onClick={onClose}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        ) : isLoading ? (
          <div className="reset-loading-state" style={{ padding: '32px 0', textAlign: 'center' }}>
            <p>Loading reset preview from server…</p>
          </div>
        ) : preview ? (
          <div className="reset-content">
            <div className="alert alert--warning reset-warning" role="alert" style={{ margin: '16px 0' }}>
              <strong>Permanent action:</strong> This will delete all non-admin data from the database. Only your admin account will be retained.
            </div>

            <div className="reset-summary-grid">
              <div className="reset-summary-card">
                <span className="reset-summary-card__value">
                  {preview.summary.nonAdminEmployeesCount}
                </span>
                <span className="reset-summary-card__label">Employees</span>
              </div>
              <div className="reset-summary-card">
                <span className="reset-summary-card__value">
                  {preview.summary.nonAdminUsersCount}
                </span>
                <span className="reset-summary-card__label">User accounts</span>
              </div>
              <div className="reset-summary-card">
                <span className="reset-summary-card__value">
                  {preview.summary.attendanceRecordsCount}
                </span>
                <span className="reset-summary-card__label">Attendance records</span>
              </div>
              <div className="reset-summary-card">
                <span className="reset-summary-card__value">
                  {preview.summary.importsCount}
                </span>
                <span className="reset-summary-card__label">Imports</span>
              </div>
              <div className="reset-summary-card">
                <span className="reset-summary-card__value">
                  {preview.summary.importIssuesCount}
                </span>
                <span className="reset-summary-card__label">Import issues</span>
              </div>
            </div>

            <div className="reset-backup-box">
              <div className="reset-backup-box__text">
                <strong>Download current data before reset</strong>
                <p>Export a complete JSON snapshot containing all employee records, attendance, and imports.</p>
              </div>
              <button
                type="button"
                className="button button--secondary"
                onClick={handleDownloadBackup}
              >
                {backupDownloaded ? 'Download backup again' : 'Download current data'}
              </button>
            </div>
            {backupDownloaded ? (
              <p className="reset-backup-notice">
                ✓ Backup file downloaded to your device.
              </p>
            ) : null}

            <div className="reset-confirmation-box">
              <label htmlFor="reset-confirm-input" className="field">
                <span>
                  To confirm, type <strong>RESET_NON_ADMIN_DATA</strong>:
                </span>
                <input
                  id="reset-confirm-input"
                  type="text"
                  autoComplete="off"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder="RESET_NON_ADMIN_DATA"
                  disabled={isResetting}
                />
              </label>
            </div>

            <div className="dialog-actions">
              <p>This action cannot be undone.</p>
              <div>
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={onClose}
                  disabled={isResetting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="button button--danger"
                  disabled={!isConfirmed || isResetting}
                  onClick={() => void handleConfirmReset()}
                >
                  {isResetting ? 'Resetting data…' : 'Reset all data'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </dialog>
  )
}
