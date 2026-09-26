import { MONTHS } from './months'
import { createEmptyMonthlyMinutes } from './calculations'
import type {
  ImportIssue,
  SheetPreview,
  WorkbookPreview,
  Worker,
} from './types'
import type { SheetData } from 'write-excel-file/browser'
import type { MonthKey } from './months'

export const MAX_FILE_SIZE = 5 * 1024 * 1024
const MAX_ROWS = 5000
const MAX_COLUMNS = 100

type ExcelRow = readonly unknown[]

const headerAliases = {
  id: ['Employee ID', 'EmployeeID', 'ID', '#', 'No.', 'No'],
  lastName: ['Last Name', 'LastName', 'Name 1'],
  firstName: ['First Name', 'FirstName', 'Name 2'],
  middleName: ['Middle Name', 'MiddleName', 'Name 3'],
}

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function isBlankRow(row: ExcelRow): boolean {
  return row.every((cell) => cell === null || String(cell).trim() === '')
}

function findColumn(headers: ExcelRow, aliases: string[]): number {
  const accepted = new Set(aliases.map(normalizeHeader))
  return headers.findIndex((header) => accepted.has(normalizeHeader(header)))
}

function findMonthColumns(headers: ExcelRow) {
  const columns = new Map<MonthKey, number>()

  MONTHS.forEach((month) => {
    const index = findColumn(headers, [
      month.label,
      month.shortLabel,
      month.key,
    ])
    if (index >= 0) {
      columns.set(month.key, index)
    }
  })

  return columns
}

function parseMinutes(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return 0
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 0 ? value : null
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.trim())
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
  }

  return null
}

function issue(
  row: number | null,
  column: string,
  message: string,
): ImportIssue {
  return { row, column, message }
}

export function parseSheetRows(
  name: string,
  rows: readonly ExcelRow[],
): SheetPreview {
  const errors: ImportIssue[] = []
  const warnings: ImportIssue[] = []

  if (rows.length > MAX_ROWS) {
    errors.push(
      issue(null, 'Workbook', `Sheet has more than ${MAX_ROWS} rows.`),
    )
  }

  const headerIndex = rows.findIndex(
    (row) => !isBlankRow(row) && row.filter((cell) => cell !== null).length >= 2,
  )

  if (headerIndex < 0) {
    errors.push(issue(null, 'Workbook', 'Sheet has no header row.'))
    return { name, workers: [], errors, warnings }
  }

  const headers = rows[headerIndex]
  if (headers.length > MAX_COLUMNS) {
    errors.push(
      issue(headerIndex + 1, 'Workbook', `Sheet has more than ${MAX_COLUMNS} columns.`),
    )
    return { name, workers: [], errors, warnings }
  }

  const idColumn = findColumn(headers, headerAliases.id)
  const lastNameColumn = findColumn(headers, headerAliases.lastName)
  const firstNameColumn = findColumn(headers, headerAliases.firstName)
  const middleNameColumn = findColumn(headers, headerAliases.middleName)
  const monthColumns = findMonthColumns(headers)

  if (idColumn < 0) {
    errors.push(
      issue(headerIndex + 1, 'Employee ID', 'Missing ID or # column.'),
    )
  }
  if (lastNameColumn < 0) {
    errors.push(
      issue(headerIndex + 1, 'Last Name', 'Missing last name or Name 1 column.'),
    )
  }
  if (firstNameColumn < 0) {
    errors.push(
      issue(headerIndex + 1, 'First Name', 'Missing first name or Name 2 column.'),
    )
  }
  if (monthColumns.size === 0) {
    errors.push(
      issue(headerIndex + 1, 'Months', 'Missing at least one month column.'),
    )
  }

  if (
    idColumn < 0 ||
    lastNameColumn < 0 ||
    firstNameColumn < 0 ||
    monthColumns.size === 0
  ) {
    return { name, workers: [], errors, warnings }
  }

  const missingMonths = MONTHS.filter(
    (month) => !monthColumns.has(month.key),
  )
  if (missingMonths.length > 0) {
    warnings.push(
      issue(
        headerIndex + 1,
        'Months',
        `Missing months treated as zero: ${missingMonths
          .map((month) => month.shortLabel)
          .join(', ')}.`,
      ),
    )
  }

  const workers: Worker[] = []
  const seenIds = new Set<string>()

  rows.slice(headerIndex + 1).forEach((row, index) => {
    if (isBlankRow(row)) {
      return
    }

    const rowNumber = headerIndex + index + 2
    const id = String(row[idColumn] ?? '').trim()
    const lastName = String(row[lastNameColumn] ?? '').trim()
    const firstName = String(row[firstNameColumn] ?? '').trim()
    const middleName =
      middleNameColumn >= 0 ? String(row[middleNameColumn] ?? '').trim() : ''
    const rowErrors: ImportIssue[] = []

    if (!id) {
      rowErrors.push(issue(rowNumber, 'Employee ID', 'Employee ID is required.'))
    } else if (seenIds.has(id.toLowerCase())) {
      rowErrors.push(issue(rowNumber, 'Employee ID', 'Employee ID is duplicated.'))
    }

    if (!lastName) {
      rowErrors.push(issue(rowNumber, 'Last Name', 'Last name is required.'))
    }
    if (!firstName) {
      rowErrors.push(issue(rowNumber, 'First Name', 'First name is required.'))
    }

    const monthlyMinutes = createEmptyMonthlyMinutes()
    monthColumns.forEach((column, month) => {
      const value = parseMinutes(row[column])
      if (value === null) {
        rowErrors.push(
          issue(
            rowNumber,
            month.toUpperCase(),
            'Late minutes must be a whole number of zero or more.',
          ),
        )
      } else {
        monthlyMinutes[month] = value
      }
    })

    if (rowErrors.length > 0) {
      errors.push(...rowErrors)
      return
    }

    seenIds.add(id.toLowerCase())
    workers.push({ id, lastName, firstName, middleName, monthlyMinutes })
  })

  if (workers.length === 0) {
    errors.push(issue(null, 'Workers', 'Sheet has no valid worker rows.'))
  }

  return { name, workers, errors, warnings }
}

export async function parseWorkbookFile(file: File): Promise<WorkbookPreview> {
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    throw new Error('Choose a modern .xlsx workbook.')
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Workbook must be 5 MB or smaller.')
  }

  const { default: readXlsxFile } = await import('read-excel-file/browser')
  const sheets = await readXlsxFile(file)

  if (sheets.length === 0) {
    throw new Error('Workbook has no sheets.')
  }

  return {
    fileName: file.name,
    sheets: sheets.map((sheet) => parseSheetRows(sheet.sheet, sheet.data)),
  }
}

function headerCell(value: string): SheetData[number][number] {
  return {
    value,
    fontWeight: 'bold',
    textColor: '#16324F',
    backgroundColor: '#DCEAF0',
    alignVertical: 'center',
    align: 'center',
    borderStyle: 'thin',
    borderColor: '#B7CBD5',
  }
}

export async function downloadWorkbookTemplate(): Promise<void> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const headers = [
    'Employee ID',
    'Last Name',
    'First Name',
    'Middle Name',
    ...MONTHS.map((month) => month.label),
  ]
  const workerRows: SheetData = [
    headers.map(headerCell),
    ...Array.from({ length: 25 }, () =>
      Array.from({ length: headers.length }, () => null),
    ),
  ]
  const instructions: SheetData = [
    ['Field', 'Expected value', 'Instructions'].map(headerCell),
    ['Employee ID', 'Unique text or number', 'Required. May also use # in imported workbooks.'],
    ['Last Name', 'Text', 'Required. Name 1 is accepted as an alias.'],
    ['First Name', 'Text', 'Required. Name 2 is accepted as an alias.'],
    ['Middle Name', 'Text', 'Optional. Name 3 is accepted as an alias.'],
    ['January–December', 'Whole minutes', 'Use zero or leave blank. Negative and decimal values are rejected.'],
    ['Month columns', 'One or more', 'Missing months are treated as zero.'],
  ]

  await writeXlsxFile([
    {
      sheet: 'Workers',
      data: workerRows,
      columns: [
        { width: 15 },
        { width: 20 },
        { width: 20 },
        { width: 20 },
        ...MONTHS.map(() => ({ width: 12 })),
      ],
      stickyRowsCount: 1,
      showGridLines: false,
    },
    {
      sheet: 'Instructions',
      data: instructions,
      columns: [{ width: 22 }, { width: 24 }, { width: 72 }],
      stickyRowsCount: 1,
      showGridLines: false,
    },
  ]).toFile('late-tracker-template.xlsx')
}
