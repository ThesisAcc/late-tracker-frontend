import { useEffect, useRef, useState } from 'react'
import { getWorkerPeriodTotal } from '../../lib/calculations'
import {
  downloadWorkbookTemplate,
  parseWorkbookFile,
} from '../../lib/excel'
import { createSampleWorkbookPreview } from '../../lib/sampleWorkbook'
import type { ImportIssue, SheetPreview, WorkbookPreview } from '../../lib/types'

interface ImportDialogProps {
  onClose: () => void
  onImport: (selection: {
    workers: SheetPreview['workers']
    fileName: string
    sheetName: string
  }) => void
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

export function ImportDialog({ onClose, onImport }: ImportDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const [preview, setPreview] = useState<WorkbookPreview | null>(null)
  const [previewOrigin, setPreviewOrigin] = useState<'file' | 'sample'>('file')
  const [selectedSheetName, setSelectedSheetName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
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

    try {
      applyPreview(await parseWorkbookFile(file), 'file')
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Workbook could not be read.',
      )
    } finally {
      setIsParsing(false)
    }
  }

  async function handleSampleWorkbook() {
    setError(null)
    setIsParsing(true)

    try {
      applyPreview(await createSampleWorkbookPreview(), 'sample')
    } finally {
      setIsParsing(false)
    }
  }

  async function handleDownload() {
    setError(null)
    setIsDownloading(true)

    try {
      await downloadWorkbookTemplate()
    } catch {
      setError('Template could not be created. Please try again.')
    } finally {
      setIsDownloading(false)
    }
  }

  function handleConfirm() {
    if (!preview || !selectedSheet || !canImport) {
      return
    }

    onImport({
      workers: selectedSheet.workers,
      fileName: preview.fileName,
      sheetName: selectedSheet.name,
    })
  }

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
              Upload a .xlsx workbook, or preview a sample while the backend is
              still being built.
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
              disabled={isDownloading}
              onClick={handleDownload}
            >
              {isDownloading ? 'Creating…' : 'Download template'}
            </button>
          </div>
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
          <p>Maximum file size: 5 MB. Data stays in this browser.</p>
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
                        setSelectedSheetName(event.target.value)
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
              disabled={!canImport || isParsing}
              onClick={handleConfirm}
            >
              Replace dataset
            </button>
          </div>
        </div>
      </div>
    </dialog>
  )
}
