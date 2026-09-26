import { describe, expect, it } from 'vitest'
import { getWorkerPeriodTotal } from './calculations'
import {
  createSampleWorkbookPreview,
  SAMPLE_FILE_NAME,
  SAMPLE_NOTES_SHEET,
  SAMPLE_WORKERS_SHEET,
} from './sampleWorkbook'

describe('createSampleWorkbookPreview', () => {
  it('previews a valid worker sheet', async () => {
    const preview = await createSampleWorkbookPreview()
    const sheet = preview.sheets[0]

    expect(preview.fileName).toBe(SAMPLE_FILE_NAME)
    expect(sheet.name).toBe(SAMPLE_WORKERS_SHEET)
    expect(sheet.errors).toEqual([])
    expect(sheet.workers.length).toBeGreaterThan(0)
    expect(sheet.workers[0].id).toBe('SMP-2001')
  })

  it('warns that the trailing months are missing', async () => {
    const preview = await createSampleWorkbookPreview()
    const sheet = preview.sheets[0]

    expect(sheet.warnings).toHaveLength(1)
    expect(sheet.warnings[0].message).toContain('Oct, Nov, Dec')
  })

  it('leaves months outside the header at zero', async () => {
    const preview = await createSampleWorkbookPreview()
    const sheet = preview.sheets[0]

    expect(sheet.workers.every((worker) => worker.monthlyMinutes.oct === 0)).toBe(
      true,
    )
  })

  it('includes a second sheet that fails validation', async () => {
    const preview = await createSampleWorkbookPreview()
    const notes = preview.sheets[1]

    expect(notes.name).toBe(SAMPLE_NOTES_SHEET)
    expect(notes.workers).toEqual([])
    expect(notes.errors).toHaveLength(1)
  })

  it('differs from the demo roster so the dashboard visibly changes', async () => {
    const preview = await createSampleWorkbookPreview()
    const sheet = preview.sheets[0]

    expect(sheet.workers.reduce((total, worker) => total + getWorkerPeriodTotal(worker), 0)).toBeGreaterThan(0)
    expect(
      sheet.workers.every((worker) => worker.id.startsWith('SMP-')),
    ).toBe(true)
  })
})
