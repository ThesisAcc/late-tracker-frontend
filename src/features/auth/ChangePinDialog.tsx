import { useEffect, useRef, useState } from 'react'
import { changePassword } from '../../lib/loginApi'

interface ChangePinDialogProps {
  onClose: () => void
}

export function ChangePinDialog({ onClose }: ChangePinDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFeedback(null)

    if (!/^\d{4}$/.test(currentPin)) {
      setFeedback({ type: 'error', text: 'Current PIN must be exactly 4 digits.' })
      return
    }
    if (!/^\d{4}$/.test(newPin)) {
      setFeedback({ type: 'error', text: 'New PIN must be exactly 4 digits.' })
      return
    }
    if (newPin === currentPin) {
      setFeedback({
        type: 'error',
        text: 'New PIN must be different from current PIN.',
      })
      return
    }
    if (newPin !== confirmPin) {
      setFeedback({ type: 'error', text: 'New PIN and confirmation do not match.' })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await changePassword({ currentPin, newPin })
      setFeedback({
        type: 'success',
        text: res.message || 'PIN changed successfully.',
      })
      setCurrentPin('')
      setNewPin('')
      setConfirmPin('')
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to change PIN',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="employees-dialog"
      aria-labelledby="change-pin-title"
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
      <div className="employees-dialog__surface">
        <div className="dialog-heading">
          <div>
            <p className="eyebrow">Account</p>
            <h2 id="change-pin-title">Change PIN</h2>
            <p>Update your login PIN. You will need it the next time you sign in.</p>
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

        {feedback ? (
          <div
            className={`alert ${
              feedback.type === 'success' ? 'alert--success' : 'alert--warning'
            }`}
            role="alert"
            style={{ margin: '16px 0' }}
          >
            <span>{feedback.text}</span>
            <button
              type="button"
              className="text-button"
              onClick={() => setFeedback(null)}
            >
              Dismiss
            </button>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="employee-form">
          <div className="form-grid">
            <label className="form-field">
              <span>Current PIN</span>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                maxLength={4}
                placeholder="****"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
              />
            </label>

            <label className="form-field">
              <span>New PIN</span>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={4}
                placeholder="****"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
              />
            </label>

            <label className="form-field">
              <span>Confirm New PIN</span>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={4}
                placeholder="****"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
              />
            </label>
          </div>

          <div className="dialog-actions" style={{ marginTop: '24px' }}>
            <button
              type="button"
              className="button button--secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button button--primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Changing…' : 'Change PIN'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  )
}
