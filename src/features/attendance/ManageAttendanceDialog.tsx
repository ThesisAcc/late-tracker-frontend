import { useEffect, useRef, useState } from 'react'
import {
  deleteAttendance,
  getEmployeeYearAttendance,
  updateAttendance,
  upsertAttendance,
  type AttendanceRecord,
  type EmployeeYearAttendance,
} from '../../lib/attendanceApi'
import { listEmployees, type EmployeeRecord } from '../../lib/employeesApi'

interface ManageAttendanceDialogProps {
  onClose: () => void
}

type DialogView = 'grid' | 'add' | 'edit' | 'delete'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export function ManageAttendanceDialog({ onClose }: ManageAttendanceDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true)
  const [employeeError, setEmployeeError] = useState<string | null>(null)

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<number>(2026)
  const [attendanceData, setAttendanceData] = useState<EmployeeYearAttendance | null>(null)
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false)
  const [attendanceError, setAttendanceError] = useState<string | null>(null)

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const [view, setView] = useState<DialogView>('grid')
  const [selectedMonth, setSelectedMonth] = useState<AttendanceRecord | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Add form state
  const [addEmployeeId, setAddEmployeeId] = useState('')
  const [addYear, setAddYear] = useState(2026)
  const [addMonth, setAddMonth] = useState(10)
  const [addMinutes, setAddMinutes] = useState(0)

  // Edit form state
  const [editMinutes, setEditMinutes] = useState(0)

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

  async function loadEmployees() {
    setIsLoadingEmployees(true)
    setEmployeeError(null)
    try {
      const data = await listEmployees()
      const active = data.filter((e) => e.status === 'ACTIVE')
      setEmployees(active)
    } catch (err) {
      setEmployeeError(err instanceof Error ? err.message : 'Failed to load employees')
    } finally {
      setIsLoadingEmployees(false)
    }
  }

  useEffect(() => {
    void loadEmployees()
  }, [])

  async function loadAttendance() {
    if (!selectedEmployeeId) {
      setAttendanceData(null)
      return
    }

    setIsLoadingAttendance(true)
    setAttendanceError(null)
    try {
      const data = await getEmployeeYearAttendance(selectedEmployeeId, selectedYear)
      setAttendanceData(data)
    } catch (err) {
      setAttendanceError(
        err instanceof Error ? err.message : 'Failed to load attendance data',
      )
    } finally {
      setIsLoadingAttendance(false)
    }
  }

  useEffect(() => {
    void loadAttendance()
  }, [selectedEmployeeId, selectedYear])

  function resetForms() {
    setAddEmployeeId('')
    setAddYear(2026)
    setAddMonth(10)
    setAddMinutes(0)
    setEditMinutes(0)
    setSelectedMonth(null)
    setView('grid')
  }

  function handleOpenAdd() {
    resetForms()
    setAddEmployeeId(selectedEmployeeId)
    setAddYear(selectedYear)
    const now = new Date()
    setAddMonth(now.getMonth() + 1)
    setView('add')
  }

  function handleOpenEdit(record: AttendanceRecord) {
    setSelectedMonth(record)
    setEditMinutes(record.minutesLate)
    setView('edit')
  }

  function handleOpenDelete(record: AttendanceRecord) {
    setSelectedMonth(record)
    setView('delete')
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setFeedback(null)

    try {
      await upsertAttendance({
        employeeId: addEmployeeId,
        year: addYear,
        month: addMonth,
        minutesLate: addMinutes,
      })

      const employee = employees.find((e) => e.id === addEmployeeId)
      const employeeName = employee
        ? `${employee.firstName} ${employee.lastName}`
        : 'Employee'

      setFeedback({
        type: 'success',
        text: `Attendance for ${employeeName} - ${MONTH_NAMES[addMonth - 1]} ${addYear} saved: ${addMinutes} minutes late.`,
      })
      resetForms()
      await loadAttendance()
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save attendance record',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedMonth || !selectedMonth.id) return

    setIsSubmitting(true)
    setFeedback(null)

    try {
      await updateAttendance(selectedMonth.id, { minutesLate: editMinutes })
      setFeedback({
        type: 'success',
        text: `Attendance for ${MONTH_NAMES[selectedMonth.month - 1]} updated to ${editMinutes} minutes.`,
      })
      resetForms()
      await loadAttendance()
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update attendance record',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteConfirm() {
    if (!selectedMonth || !selectedMonth.id) return

    setIsSubmitting(true)
    setFeedback(null)

    try {
      await deleteAttendance(selectedMonth.id)
      setFeedback({
        type: 'success',
        text: `Attendance for ${MONTH_NAMES[selectedMonth.month - 1]} deleted successfully.`,
      })
      resetForms()
      await loadAttendance()
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to delete attendance record',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId)

  return (
    <dialog
      ref={dialogRef}
      className="employees-dialog"
      aria-labelledby="manage-attendance-title"
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
            <h2 id="manage-attendance-title">Manual Attendance</h2>
            <p>Create or edit attendance records without importing Excel files.</p>
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

        {feedback && (
          <div className={`alert alert--${feedback.type}`}>{feedback.text}</div>
        )}

        {view === 'grid' && (
          <div className="employees-dialog__panel">
            <div className="employees-list__controls">
              <div style={{ display: 'flex', gap: '12px', alignItems: 'end' }}>
                <div className="field">
                  <label htmlFor="employee-select">Employee</label>
                  {isLoadingEmployees ? (
                    <select disabled>
                      <option>Loading...</option>
                    </select>
                  ) : employeeError ? (
                    <select disabled>
                      <option>Error loading employees</option>
                    </select>
                  ) : (
                    <select
                      id="employee-select"
                      value={selectedEmployeeId}
                      onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    >
                      <option value="">Select an employee...</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.employeeCode} - {emp.firstName} {emp.lastName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="field">
                  <label htmlFor="year-select">Year</label>
                  <select
                    id="year-select"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                  >
                    {Array.from({ length: 11 }, (_, i) => 2020 + i).map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                className="button button--primary"
                onClick={handleOpenAdd}
                disabled={!selectedEmployeeId}
              >
                Add Record
              </button>
            </div>

            {!selectedEmployeeId ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#5b6d78' }}>
                Select an employee to view their attendance records.
              </div>
            ) : isLoadingAttendance ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#5b6d78' }}>
                Loading attendance data...
              </div>
            ) : attendanceError ? (
              <div className="alert alert--error" style={{ margin: '16px 0' }}>
                {attendanceError}
              </div>
            ) : attendanceData ? (
              <div className="table-wrap" style={{ marginTop: '16px' }}>
                <table className="worker-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Minutes Late</th>
                      <th>Source</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceData.months.map((record) => (
                      <tr key={record.month}>
                        <td>{MONTH_NAMES[record.month - 1]}</td>
                        <td>
                          {record.minutesLate === 0 ? (
                            <span style={{ color: '#7b8f99' }}>—</span>
                          ) : (
                            <strong>{record.minutesLate}</strong>
                          )}
                        </td>
                        <td>
                          {record.id === null ? (
                            <span style={{ color: '#9aa9b2', fontSize: '12px' }}>
                              No data
                            </span>
                          ) : record.importId ? (
                            <span
                              style={{
                                fontSize: '12px',
                                color: '#647781',
                                background: '#f0f4f6',
                                padding: '3px 8px',
                                borderRadius: '4px',
                              }}
                            >
                              📊 Imported
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: '12px',
                                color: '#0f6e3a',
                                background: '#e8f2ec',
                                padding: '3px 8px',
                                borderRadius: '4px',
                              }}
                            >
                              ✎ Manual
                            </span>
                          )}
                        </td>
                        <td>
                          {record.id ? (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                className="text-button"
                                onClick={() => handleOpenEdit(record)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="text-button"
                                style={{ color: 'var(--color-danger)' }}
                                onClick={() => handleOpenDelete(record)}
                              >
                                Delete
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: '#9aa9b2', fontSize: '12px' }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        )}

        {view === 'add' && (
          <div className="employees-dialog__panel">
            <form onSubmit={handleAddSubmit}>
              <div style={{ display: 'grid', gap: '14px' }}>
                <div className="field">
                  <label htmlFor="add-employee-id">Employee</label>
                  <select
                    id="add-employee-id"
                    value={addEmployeeId}
                    onChange={(e) => setAddEmployeeId(e.target.value)}
                    required
                  >
                    <option value="">Select employee...</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.employeeCode} - {emp.firstName} {emp.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="field">
                    <label htmlFor="add-year">Year</label>
                    <select
                      id="add-year"
                      value={addYear}
                      onChange={(e) => setAddYear(Number(e.target.value))}
                      required
                    >
                      {Array.from({ length: 11 }, (_, i) => 2020 + i).map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label htmlFor="add-month">Month</label>
                    <select
                      id="add-month"
                      value={addMonth}
                      onChange={(e) => setAddMonth(Number(e.target.value))}
                      required
                    >
                      {MONTH_NAMES.map((name, idx) => (
                        <option key={idx + 1} value={idx + 1}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="add-minutes">Minutes Late</label>
                  <input
                    id="add-minutes"
                    type="number"
                    min="0"
                    step="1"
                    value={addMinutes}
                    onChange={(e) => setAddMinutes(Number(e.target.value))}
                    required
                    style={{
                      minHeight: '44px',
                      padding: '9px 12px',
                      border: '1px solid #cdd9df',
                      borderRadius: '9px',
                      color: '#203b48',
                      background: '#ffffff',
                    }}
                  />
                </div>
              </div>

              <div className="dialog-actions">
                <div>
                  <button
                    type="button"
                    className="button button--secondary"
                    onClick={resetForms}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="button button--primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : 'Save Record'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {view === 'edit' && selectedMonth && (
          <div className="employees-dialog__panel">
            <form onSubmit={handleEditSubmit}>
              <p style={{ color: '#5b6d78', fontSize: '13px', margin: '0 0 16px' }}>
                Editing {MONTH_NAMES[selectedMonth.month - 1]} {attendanceData?.year} for{' '}
                {selectedEmployee?.firstName} {selectedEmployee?.lastName}
              </p>

              <div className="field">
                <label htmlFor="edit-minutes">Minutes Late</label>
                <input
                  id="edit-minutes"
                  type="number"
                  min="0"
                  step="1"
                  value={editMinutes}
                  onChange={(e) => setEditMinutes(Number(e.target.value))}
                  required
                  style={{
                    minHeight: '44px',
                    padding: '9px 12px',
                    border: '1px solid #cdd9df',
                    borderRadius: '9px',
                    color: '#203b48',
                    background: '#ffffff',
                  }}
                />
              </div>

              <div className="dialog-actions">
                <div>
                  <button
                    type="button"
                    className="button button--secondary"
                    onClick={resetForms}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="button button--primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Updating...' : 'Update Record'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {view === 'delete' && selectedMonth && (
          <div className="employees-dialog__panel">
            <p style={{ color: '#5b6d78', fontSize: '13px', margin: '0 0 16px' }}>
              Are you sure you want to delete the attendance record for{' '}
              {MONTH_NAMES[selectedMonth.month - 1]} {attendanceData?.year}?
            </p>

            <div
              style={{
                padding: '12px',
                background: '#fdf1f3',
                border: '1px solid #eac4cc',
                borderRadius: '8px',
                marginBottom: '16px',
              }}
            >
              <p style={{ margin: 0, fontSize: '13px', color: '#8e2f3f' }}>
                This will permanently remove {selectedMonth.minutesLate} minutes late for{' '}
                {selectedEmployee?.firstName} {selectedEmployee?.lastName}.
              </p>
            </div>

            <div className="dialog-actions">
              <div>
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={resetForms}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="button button--primary"
                  style={{
                    background: 'var(--color-danger)',
                    borderColor: 'var(--color-danger)',
                  }}
                  onClick={handleDeleteConfirm}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Deleting...' : 'Delete Record'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </dialog>
  )
}
