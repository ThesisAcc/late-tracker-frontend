import { parseSheetRows } from './excel'
import { MONTHS } from './months'
import type { WorkbookPreview } from './types'

export const SAMPLE_FILE_NAME = 'sample-attendance-2026.xlsx'
export const SAMPLE_WORKERS_SHEET = 'Workers'
export const SAMPLE_NOTES_SHEET = 'Notes'

const reportedMonthHeaders = MONTHS.filter(
  (month) => month.key !== 'oct' && month.key !== 'nov' && month.key !== 'dec',
)

const sampleRows: Array<[string, string, string, string, ...number[]]> = [
  ['SMP-2001', 'Aguilar', 'Nadia', 'P.', 12, 8, 21, 17, 26, 14, 9, 19, 31],
  ['SMP-2002', 'Bergstrom', 'Nils', '', 0, 4, 0, 9, 0, 13, 6, 0, 22],
  ['SMP-2003', 'Chandran', 'Divya', 'S.', 37, 29, 44, 51, 38, 33, 47, 41, 55],
  ['SMP-2004', 'Duarte', 'Ines', '', 5, 0, 11, 0, 7, 0, 15, 3, 12],
  ['SMP-2005', 'Eriksen', 'Magne', 'O.', 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ['SMP-2006', 'Farhan', 'Aida', 'R.', 19, 24, 16, 28, 22, 31, 18, 27, 35],
  ['SMP-2007', 'Gomez', 'Rafael', 'M.', 63, 71, 58, 80, 66, 74, 61, 69, 78],
  ['SMP-2008', 'Haugen', 'Solveig', '', 8, 0, 13, 0, 5, 17, 0, 11, 6],
  ['SMP-2009', 'Iqbal', 'Zainab', 'K.', 26, 18, 34, 22, 29, 20, 37, 25, 31],
  ['SMP-2010', 'Jensen', 'Kasper', 'L.', 2, 9, 0, 14, 4, 0, 8, 5, 0],
  ['SMP-2011', 'Kowalczyk', 'Ewa', '', 45, 39, 52, 44, 61, 48, 55, 41, 58],
]

function buildWorkerSheetRows(): Array<Array<string | number | null>> {
  return [
    [
      'Employee ID',
      'Last Name',
      'First Name',
      'Middle Name',
      ...reportedMonthHeaders.map((month) => month.label),
    ],
    ...sampleRows,
  ]
}

export function createSampleWorkbookPreview(): Promise<WorkbookPreview> {
  return Promise.resolve({
    fileName: SAMPLE_FILE_NAME,
    sheets: [
      parseSheetRows(SAMPLE_WORKERS_SHEET, buildWorkerSheetRows()),
      parseSheetRows(SAMPLE_NOTES_SHEET, [
        ['Notes'],
        ['This sheet is a note, not a worker table.'],
      ]),
    ],
  })
}
