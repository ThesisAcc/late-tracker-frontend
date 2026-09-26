import { useCallback, useEffect, useState } from 'react'
import {
  getActiveRepository,
  SAVE_WARNING,
  type ImportSelection,
  type RepositoryOutcome,
} from '../lib/dataSource'
import { createDemoData } from '../lib/demoData'
import type { TrackerData } from '../lib/types'

export type LoadStatus = 'loading' | 'ready'

export function useLateTrackerData() {
  const repository = getActiveRepository()
  const [data, setData] = useState<TrackerData>(createDemoData)
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [saveWarning, setSaveWarning] = useState<string | null>(null)

  useEffect(() => {
    let isCurrent = true

    repository.load().then(
      (loaded) => {
        if (isCurrent) {
          setData(loaded)
          setStatus('ready')
        }
      },
      () => {
        if (isCurrent) {
          setSaveWarning(
            'Stored records could not be read, so sample records are shown instead.',
          )
          setStatus('ready')
        }
      },
    )

    return () => {
      isCurrent = false
    }
  }, [repository])

  const applyOutcome = useCallback(
    ({ data: nextData, persisted }: RepositoryOutcome) => {
      setData(nextData)
      setStatus('ready')
      setSaveWarning(persisted ? null : SAVE_WARNING)
    },
    [],
  )

  const importWorkbook = useCallback(
    (selection: ImportSelection) =>
      repository.applyImport(selection).then(applyOutcome),
    [applyOutcome, repository],
  )

  const restoreDemo = useCallback(
    () => repository.restoreDemo().then(applyOutcome),
    [applyOutcome, repository],
  )

  const clearSaveWarning = useCallback(() => setSaveWarning(null), [])

  return {
    data,
    status,
    saveWarning,
    importWorkbook,
    restoreDemo,
    clearSaveWarning,
  }
}
