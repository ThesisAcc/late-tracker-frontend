import { useEffect, useRef, useState } from 'react'
import { getWorkerPeriodTotal } from '../../lib/calculations'
import {
  ApiError,
  apiWorkerToWorker,
  downloadTemplate,
  previewImport,
  type ImportIssueApi,
} from '../../lib/importsApi'
import { createSampleWorkbookPreview } from '../../lib/sampleWorkbook'
import type { ImportIssue, SheetPreview, WorkbookPreview } from '../../lib/types'

interface ImportDialogProps {
  onClose: () => void
  /** year to attach to the import — caller typically shows a year picker */
  year?: number
  onImport: (selection: {
    workers: SheetPreview['workers']
    fileName: string
    sheetName: string
    /** raw File for the server repository to re-upload */
    file?: File
    year?: number
  }) => void | Promise<void>
}

function IssueList({
  issues,
  title,
}: {
  issues: ImportIssue[]
  title: string
}) {
  if (issues.length === 0) {
    return null
  }

  return (
    <div className="issue-block">
      <h3>{title}</h3>
      <ul>
        {issues.map((item, index) => (
          <li key={`${item.row}-${item.column}-${index}`}>
            {item.row ? `Row ${item.row}, ${item.column}: ` : `${item.column}: `}
            {item.message}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ImportDialog({ onClose, onImport, year: initialYear }: ImportDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [year, setYear] = useState(initialYear ?? new Date().getFullYear())
  const [preview, setPreview] = useState<WorkbookPreview | null>(null)
  const [previewOrigin, setPreviewOrigin] = useState<'file' | 'sample'>('file')
  const [selectedSheetName, setSelectedSheetName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const selectedSheet =
    preview?.sheets.find((sheet) => sheet.name === selectedSheetName) ?? null
  const canImport = !!selectedSheet && selectedSheet.errors.length === 0

  function applyPreview(nextPreview: WorkbookPreview, origin: 'file' | 'sample') {
    const firstValidSheet = nextPreview.sheets.find(
      (sheet) => sheet.errors.length === 0 && sheet.workers.length > 0,
    )
    setPreview(nextPreview)
    setPreviewOrigin(origin)
    setSelectedSheetName((firstValidSheet ?? nextPreview.sheets[0]).name)
  }

  async function handleFile(file: File) {
    setError(null)
    setPreview(null)
    setSelectedSheetName('')
    setIsParsing(true)
    setSelectedFile(file)

    try {
      const data = await previewImport(file, year)

      const toIssue = (i: ImportIssueApi) => ({
        row: i.rowNumber,
        column: i.column,
        message: i.message,
      })

      const availableSheets =
        data.availableSheets && data.availableSheets.length > 0
          ? data.availableSheets
          : [data.sheetName]

      const sheets: SheetPreview[] = availableSheets.map((name) => {
        if (name === data.sheetName) {
          return {
            name: data.sheetName,
            workers: data.workers.map(apiWorkerToWorker) as SheetPreview['workers'],
            errors: data.issues.filter((i) => i.severity === 'ERROR').map(toIssue),
            warnings: data.issues.filter((i) => i.severity === 'WARNING').map(toIssue),
          }
        }
        return {
          name,
          workers: [],
          errors: [],
          warnings: [],
        }
      })

      applyPreview({ fileName: data.fileName, sheets }, 'file')
    } catch (caughtError: unknown) {
      if (caughtError instanceof ApiError && caughtError.details?.errors) {
        const toIssue = (i: NonNullable<ApiError['details']>['errors'] extends (infer T)[] | undefined ? T : never) => ({
          row: i.row ?? i.rowNumber ?? null,
          column: i.column ?? '',
          message: i.message ?? '',
        })
        const sheets: SheetPreview[] = [
          {
            name: 'Sheet1',
            workers: [],
            errors: caughtError.details.errors.map(toIssue),
            warnings: [],
          },
        ]
        applyPreview({ fileName: file.name, sheets }, 'file')
      }
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Could not reach the server.',
      )
    } finally {
      setIsParsing(false)
    }
  }

  async function handleSheetChange(nextSheetName: string) {
    setSelectedSheetName(nextSheetName)
    if (!selectedFile || previewOrigin !== 'file') return

    const sheet = preview?.sheets.find((s) => s.name === nextSheetName)
    if (sheet && (sheet.workers.length > 0 || sheet.errors.length > 0)) {
      return
    }

    setIsParsing(true)
    try {
      const data = await previewImport(selectedFile, year, nextSheetName)
      const toIssue = (i: ImportIssueApi) => ({
        row: i.rowNumber,
        column: i.column,
        message: i.message,
      })

      setPreview((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          sheets: prev.sheets.map((s) =>
            s.name === nextSheetName
              ? {
                  name: data.sheetName,
                  workers: data.workers.map(apiWorkerToWorker) as SheetPreview['workers'],
                  errors: data.issues.filter((i) => i.severity === 'ERROR').map(toIssue),
                  warnings: data.issues.filter((i) => i.severity === 'WARNING').map(toIssue),
                }
              : s,
          ),
        }
      })
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Could not reach the server.',
      )
    } finally {
      setIsParsing(false)
    }
  }

  async function handleYearChange(newYear: number) {
    setYear(newYear)
    if (selectedFile && previewOrigin === 'file') {
      setIsParsing(true)
      try {
        const data = await previewImport(
          selectedFile,
          newYear,
          selectedSheetName || undefined,
        )
        const toIssue = (i: ImportIssueApi) => ({
          row: i.rowNumber,
          column: i.column,
          message: i.message,
        })
        const availableSheets =
          data.availableSheets && data.availableSheets.length > 0
            ? data.availableSheets
            : [data.sheetName]

        const sheets: SheetPreview[] = availableSheets.map((name) => {
          if (name === data.sheetName) {
            return {
              name: data.sheetName,
              workers: data.workers.map(apiWorkerToWorker) as SheetPreview['workers'],
              errors: data.issues.filter((i) => i.severity === 'ERROR').map(toIssue),
              warnings: data.issues.filter((i) => i.severity === 'WARNING').map(toIssue),
            }
          }
          return {
            name,
            workers: [],
            errors: [],
            warnings: [],
          }
        })
        applyPreview({ fileName: data.fileName, sheets }, 'file')
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Could not reach the server.',
        )
      } finally {
        setIsParsing(false)
      }
    }
  }

  async function handleSampleWorkbook() {
    setError(null)
    setIsParsing(true)
    setSelectedFile(null)

    try {
      applyPreview(await createSampleWorkbookPreview(), 'sample')
    } finally {
      setIsParsing(false)
    }
  }

  function handleDownload() {
    downloadTemplate()
  }

  async function handleConfirm() {
    if (!preview || !selectedSheet || !canImport) {
      return
    }

    try {
      setIsSubmitting(true)
      await onImport({
        workers: selectedSheet.workers,
        fileName: preview.fileName,
        sheetName: selectedSheet.name,
        file: selectedFile ?? undefined,
        year,
      })
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to import dataset.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const yearOptions = Array.from(
    new Set([2024, 2025, 2026, 2027, year]),
  ).sort((a, b) => a - b)

  return (
    <dialog
      ref={dialogRef}
      className="import-dialog"
      aria-labelledby="import-title"
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
      <div className="import-dialog__surface">
        <div className="dialog-heading">
          <div>
            <p className="eyebrow">Data import</p>
            <h2 id="import-title">Import worker totals</h2>
            <p>
              Upload a .xlsx workbook to sync worker attendance with the server.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="icon-button"
            aria-label="Close import dialog"
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="template-callout">
          <div>
            <strong>Need the correct format?</strong>
            <p>Download a workbook with all 12 month columns and instructions.</p>
          </div>
          <div className="template-callout__actions">
            <button
              type="button"
              className="button button--quiet"
              onClick={() => void handleSampleWorkbook()}
            >
              Use sample workbook
            </button>
            <button
              type="button"
              className="button button--secondary"
              onClick={handleDownload}
            >
              Download template
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label className="field field--compact">
            <span>Target year</span>
            <select
              value={year}
              onChange={(e) => void handleYearChange(Number(e.target.value))}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div
          className={`drop-zone${isDragging ? ' drop-zone--active' : ''}`}
          onDragEnter={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            event.preventDefault()
            setIsDragging(false)
          }}
          onDrop={(event) => {
            event.preventDefault()
            setIsDragging(false)
            const file = event.dataTransfer.files[0]
            if (file) {
              void handleFile(file)
            }
          }}
        >
          <span className="drop-zone__icon" aria-hidden="true">
            XLS
          </span>
          <h3>Drop an .xlsx workbook here</h3>
          <p>Maximum file size: 5 MB (.xlsx)</p>
          <input
            ref={inputRef}
            id="workbook-upload"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) {
                void handleFile(file)
              }
            }}
          />
          <label className="button button--primary" htmlFor="workbook-upload">
            {isParsing ? 'Reading workbook…' : 'Choose workbook'}
          </label>
        </div>

        <div className="import-status" aria-live="polite">
          {error ? (
            <p className="alert alert--error" role="alert">
              {error}
            </p>
          ) : null}

          {preview ? (
            <div className="preview-panel">
              <div className="preview-panel__heading">
                <div>
                  <p className="eyebrow">
                    Preview
                    {previewOrigin === 'sample' ? (
                      <span className="preview-panel__tag">Sample data</span>
                    ) : null}
                  </p>
                  <h3>{preview.fileName}</h3>
                </div>
                {preview.sheets.length > 1 ? (
                  <label className="field field--compact">
                    <span>Sheet</span>
                    <select
                      value={selectedSheetName}
                      onChange={(event) =>
                        void handleSheetChange(event.target.value)
                      }
                    >
                      {preview.sheets.map((sheet) => (
                        <option value={sheet.name} key={sheet.name}>
                          {sheet.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>

              {selectedSheet ? (
                <>
                  <div className="preview-stats">
                    <span>
                      <strong>{selectedSheet.workers.length}</strong> valid workers
                    </span>
                    <span>
                      <strong>
                        {selectedSheet.workers.reduce(
                          (total, worker) => total + getWorkerPeriodTotal(worker),
                          0,
                        ).toLocaleString('en-US')}
                      </strong>{' '}
                      total minutes
                    </span>
                    <span>
                      <strong>{selectedSheet.errors.length}</strong> errors
                    </span>
                  </div>
                  <IssueList issues={selectedSheet.errors} title="Fix before import" />
                  <IssueList issues={selectedSheet.warnings} title="Warnings" />
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="dialog-actions">
          <p>Import replaces current data after confirmation.</p>
          <div>
            <button
              type="button"
              className="button button--secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="button button--primary"
              disabled={!canImport || isParsing || isSubmitting}
              onClick={() => void handleConfirm()}
            >
              {isSubmitting ? 'Importing…' : 'Replace dataset'}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  )
}
