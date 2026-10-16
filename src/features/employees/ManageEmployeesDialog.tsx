import { useEffect, useRef, useState } from 'react'
import {
  createEmployee,
  deleteEmployee,
  listEmployees,
  resetEmployeePassword,
  updateEmployee,
  type CreateEmployeeInput,
  type EmployeeRecord,
  type UpdateEmployeeInput,
} from '../../lib/employeesApi'

interface ManageEmployeesDialogProps {
  onClose: () => void
  onEmployeesUpdated?: () => void
}

type DialogView = 'list' | 'add' | 'edit' | 'delete' | 'reset-pin'

export function ManageEmployeesDialog({
  onClose,
  onEmployeesUpdated,
}: ManageEmployeesDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const [search, setSearch] = useState('')
  const [view, setView] = useState<DialogView>('list')
  const [selectedEmployee, setSelectedEmployee] =
    useState<EmployeeRecord | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Add Form state
  const [addCode, setAddCode] = useState('')
  const [addFirstName, setAddFirstName] = useState('')
  const [addMiddleName, setAddMiddleName] = useState('')
  const [addLastName, setAddLastName] = useState('')
  const [addPin, setAddPin] = useState('')

  // Edit Form state
  const [editFirstName, setEditFirstName] = useState('')
  const [editMiddleName, setEditMiddleName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE')

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

  async function loadData() {
    setIsLoading(true)
    setError(null)
    try {
      const data = await listEmployees()
      setEmployees(data)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load employee list',
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  function resetForms() {
    setAddCode('')
    setAddFirstName('')
    setAddMiddleName('')
    setAddLastName('')
    setAddPin('')
    setEditFirstName('')
    setEditMiddleName('')
    setEditLastName('')
    setEditStatus('ACTIVE')
    setSelectedEmployee(null)
    setView('list')
  }

  function handleOpenAdd() {
    resetForms()
    setView('add')
  }

  function handleOpenEdit(emp: EmployeeRecord) {
    setSelectedEmployee(emp)
    setEditFirstName(emp.firstName)
    setEditMiddleName(emp.middleName ?? '')
    setEditLastName(emp.lastName)
    setEditStatus(emp.status)
    setView('edit')
  }

  function handleOpenDelete(emp: EmployeeRecord) {
    setSelectedEmployee(emp)
    setView('delete')
  }

  function handleOpenResetPin(emp: EmployeeRecord) {
    setSelectedEmployee(emp)
    setView('reset-pin')
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setFeedback(null)

    // Normalize code: if entered without "EMP-", auto-prefix if only digits
    let formattedCode = addCode.trim()
    if (/^\d+$/.test(formattedCode)) {
      formattedCode = `EMP-${formattedCode}`
    }

    const payload: CreateEmployeeInput = {
      employeeCode: formattedCode,
      firstName: addFirstName.trim(),
      middleName: addMiddleName.trim() || null,
      lastName: addLastName.trim(),
    }
    if (addPin.trim()) {
      payload.pin = addPin.trim()
    }

    try {
      const created = await createEmployee(payload)
      setFeedback({
        type: 'success',
        text: `Employee ${created.employeeCode} (${created.firstName} ${created.lastName}) added successfully.${
          created.generatedPin ? ` Generated PIN: ${created.generatedPin}` : ''
        }`,
      })
      resetForms()
      await loadData()
      onEmployeesUpdated?.()
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to create employee',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedEmployee) return

    setIsSubmitting(true)
    setFeedback(null)

    const payload: UpdateEmployeeInput = {
      firstName: editFirstName.trim(),
      middleName: editMiddleName.trim() || null,
      lastName: editLastName.trim(),
      status: editStatus,
    }

    try {
      await updateEmployee(selectedEmployee.id, payload)
      setFeedback({
        type: 'success',
        text: `Employee ${selectedEmployee.employeeCode} updated successfully.`,
      })
      resetForms()
      await loadData()
      onEmployeesUpdated?.()
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update employee',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteConfirm() {
    if (!selectedEmployee) return

    setIsSubmitting(true)
    setFeedback(null)

    try {
      await deleteEmployee(selectedEmployee.id)
      setFeedback({
        type: 'success',
        text: `Employee ${selectedEmployee.employeeCode} deleted successfully.`,
      })
      resetForms()
      await loadData()
      onEmployeesUpdated?.()
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to delete employee',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResetPinConfirm() {
    if (!selectedEmployee) return

    setIsSubmitting(true)
    setFeedback(null)

    try {
      const res = await resetEmployeePassword(selectedEmployee.id)
      setFeedback({
        type: 'success',
        text: `${res.message} for ${selectedEmployee.firstName} ${selectedEmployee.lastName}.`,
      })
      resetForms()
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to reset PIN',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const normalizedSearch = search.trim().toLowerCase()
  const filteredEmployees = employees.filter((emp) => {
    if (!normalizedSearch) return true
    const haystack = [
      emp.employeeCode,
      emp.firstName,
      emp.middleName ?? '',
      emp.lastName,
      emp.status,
      emp.user?.role ?? '',
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(normalizedSearch)
  })

  return (
    <dialog
      ref={dialogRef}
      className="employees-dialog"
      aria-labelledby="manage-employees-title"
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
            <p className="eyebrow">Administration</p>
            <h2 id="manage-employees-title">Manage Employees</h2>
            <p>Register, modify, or reset PIN for workforce members.</p>
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

        {view === 'list' && (
          <div className="employees-content">
            <div className="employees-toolbar">
              <input
                type="search"
                className="search-input"
                placeholder="Search by code or name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search employees"
              />
              <button
                type="button"
                className="button button--primary"
                onClick={handleOpenAdd}
              >
                + Add Employee
              </button>
            </div>

            {isLoading ? (
              <div style={{ padding: '36px 0', textAlign: 'center' }}>
                <p>Loading employees…</p>
              </div>
            ) : error ? (
              <div className="alert alert--warning" role="alert" style={{ margin: '20px 0' }}>
                <span>{error}</span>
                <button type="button" className="text-button" onClick={loadData}>
                  Retry
                </button>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div style={{ padding: '36px 0', textAlign: 'center', color: '#5b6e79' }}>
                <p>{search ? 'No employees match your search.' : 'No employees registered yet.'}</p>
              </div>
            ) : (
              <div className="table-wrap" style={{ marginTop: '16px' }}>
                <table className="worker-table">
                  <thead>
                    <tr>
                      <th>Employee Code</th>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((emp) => (
                      <tr key={emp.id}>
                        <td>
                          <strong>{emp.employeeCode}</strong>
                        </td>
                        <td>
                          {[emp.firstName, emp.middleName, emp.lastName]
                            .filter(Boolean)
                            .join(' ')}
                        </td>
                        <td>
                          <small>{emp.user?.role ?? 'EMPLOYEE'}</small>
                        </td>
                        <td>
                          <span
                            className={`status-badge status-badge--${emp.status.toLowerCase()}`}
                          >
                            {emp.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div
                            style={{
                              display: 'inline-flex',
                              gap: '8px',
                              justifyContent: 'flex-end',
                            }}
                          >
                            <button
                              type="button"
                              className="button button--quiet button--small"
                              onClick={() => handleOpenEdit(emp)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="button button--quiet button--small"
                              onClick={() => handleOpenResetPin(emp)}
                              title="Reset PIN to 1234"
                            >
                              Reset PIN
                            </button>
                            <button
                              type="button"
                              className="button button--quiet button--small button--danger-text"
                              onClick={() => handleOpenDelete(emp)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {view === 'add' && (
          <form onSubmit={handleAddSubmit} className="employee-form">
            <h3>Add New Employee</h3>
            <p style={{ margin: '4px 0 16px', color: '#5b6e79', fontSize: '13px' }}>
              Create an employee profile and user login account.
            </p>

            <div className="form-grid">
              <label className="form-field">
                <span>Employee Code *</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. EMP-1001"
                  value={addCode}
                  onChange={(e) => setAddCode(e.target.value)}
                />
                <small style={{ color: '#5b6e79', fontSize: '11px' }}>
                  Format: EMP-1001 (prefix added automatically if numeric)
                </small>
              </label>

              <label className="form-field">
                <span>First Name *</span>
                <input
                  type="text"
                  required
                  placeholder="First name"
                  value={addFirstName}
                  onChange={(e) => setAddFirstName(e.target.value)}
                />
              </label>

              <label className="form-field">
                <span>Middle Name</span>
                <input
                  type="text"
                  placeholder="Middle name (optional)"
                  value={addMiddleName}
                  onChange={(e) => setAddMiddleName(e.target.value)}
                />
              </label>

              <label className="form-field">
                <span>Last Name *</span>
                <input
                  type="text"
                  required
                  placeholder="Last name"
                  value={addLastName}
                  onChange={(e) => setAddLastName(e.target.value)}
                />
              </label>

              <label className="form-field">
                <span>4-digit PIN</span>
                <input
                  type="password"
                  maxLength={4}
                  pattern="\d{4}"
                  placeholder="Default generated if empty"
                  value={addPin}
                  onChange={(e) => setAddPin(e.target.value)}
                />
                <small style={{ color: '#5b6e79', fontSize: '11px' }}>
                  Leave blank to auto-generate PIN
                </small>
              </label>
            </div>

            <div className="dialog-actions" style={{ marginTop: '24px' }}>
              <button
                type="button"
                className="button button--secondary"
                onClick={resetForms}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="button button--primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating…' : 'Save Employee'}
              </button>
            </div>
          </form>
        )}

        {view === 'edit' && selectedEmployee && (
          <form onSubmit={handleEditSubmit} className="employee-form">
            <h3>Edit Employee: {selectedEmployee.employeeCode}</h3>
            <p style={{ margin: '4px 0 16px', color: '#5b6e79', fontSize: '13px' }}>
              Update employee profile details and status.
            </p>

            <div className="form-grid">
              <label className="form-field">
                <span>First Name *</span>
                <input
                  type="text"
                  required
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                />
              </label>

              <label className="form-field">
                <span>Middle Name</span>
                <input
                  type="text"
                  value={editMiddleName}
                  onChange={(e) => setEditMiddleName(e.target.value)}
                />
              </label>

              <label className="form-field">
                <span>Last Name *</span>
                <input
                  type="text"
                  required
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                />
              </label>

              <label className="form-field">
                <span>Status</span>
                <select
                  value={editStatus}
                  onChange={(e) =>
                    setEditStatus(e.target.value as 'ACTIVE' | 'INACTIVE')
                  }
                  className="select-field"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </label>
            </div>

            <div className="dialog-actions" style={{ marginTop: '24px' }}>
              <button
                type="button"
                className="button button--secondary"
                onClick={resetForms}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="button button--primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

        {view === 'delete' && selectedEmployee && (
          <div className="employee-confirm-view">
            <h3>Delete Employee</h3>
            <p style={{ margin: '12px 0 20px', color: '#304956', lineHeight: 1.5 }}>
              Are you sure you want to delete{' '}
              <strong>
                {[
                  selectedEmployee.firstName,
                  selectedEmployee.middleName,
                  selectedEmployee.lastName,
                ]
                  .filter(Boolean)
                  .join(' ')}{' '}
                ({selectedEmployee.employeeCode})
              </strong>
              ? All attendance records and login access associated with this employee
              will be permanently removed.
            </p>

            <div className="dialog-actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={resetForms}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button button--danger"
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Deleting…' : 'Yes, Delete Employee'}
              </button>
            </div>
          </div>
        )}

        {view === 'reset-pin' && selectedEmployee && (
          <div className="employee-confirm-view">
            <h3>Reset Employee PIN</h3>
            <p style={{ margin: '12px 0 20px', color: '#304956', lineHeight: 1.5 }}>
              Reset login PIN for{' '}
              <strong>
                {[
                  selectedEmployee.firstName,
                  selectedEmployee.middleName,
                  selectedEmployee.lastName,
                ]
                  .filter(Boolean)
                  .join(' ')}{' '}
                ({selectedEmployee.employeeCode})
              </strong>{' '}
              to default <strong>1234</strong>?
            </p>

            <div className="dialog-actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={resetForms}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button button--primary"
                onClick={handleResetPinConfirm}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Resetting…' : 'Reset PIN to 1234'}
              </button>
            </div>
          </div>
        )}
      </div>
    </dialog>
  )
}
