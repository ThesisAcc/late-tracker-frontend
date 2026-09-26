import type { TrackerSource } from '../lib/types'

type NoticeSource = Exclude<TrackerSource, 'demo'>

interface DataSourceNoticeProps {
  source: NoticeSource
  fileName?: string
  sheetName?: string
  showActions: boolean
  onOpenImport: () => void
  onRestoreDemo: () => void
}

interface NoticeCopy {
  label: string
  message: string
  importLabel: string
}

function getNoticeCopy(
  source: NoticeSource,
  fileName?: string,
  sheetName?: string,
): NoticeCopy {
  if (source === 'server') {
    return {
      label: 'Live data',
      message: 'Records are synced from the attendance server.',
      importLabel: 'Import Excel',
    }
  }

  return {
    label: 'Imported dataset',
    message: `${fileName || 'Workbook'} · ${sheetName || 'Selected sheet'}`,
    importLabel: 'Replace data',
  }
}

export function DataSourceNotice({
  source,
  fileName,
  sheetName,
  showActions,
  onOpenImport,
  onRestoreDemo,
}: DataSourceNoticeProps) {
  const copy = getNoticeCopy(source, fileName, sheetName)

  return (
    <section
      className={`data-notice data-notice--${source}`}
      aria-label="Data source"
    >
      <p className="data-notice__label">{copy.label}</p>
      <p className="data-notice__message">{copy.message}</p>
      {showActions ? (
        <div className="data-notice__actions">
          {source === 'upload' ? (
            <button
              type="button"
              className="button button--quiet"
              onClick={onRestoreDemo}
            >
              Restore demo
            </button>
          ) : null}
          <button
            type="button"
            className="button button--secondary"
            onClick={onOpenImport}
          >
            {copy.importLabel}
          </button>
        </div>
      ) : null}
    </section>
  )
}
