import { describe, expect, it } from 'vitest'
import { parseSheetRows } from './excel'

const FULL_HEADERS = [
  'Employee ID',
  'Last Name',
  'First Name',
  'Middle Name',
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

function fullRow(id: string, january: number) {
  return [
    id,
    'Reyes',
    'Avery',
    '',
    january,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
  ]
}

describe('parseSheetRows', () => {
  it('parses a valid worker row into monthly minutes', () => {
    const preview = parseSheetRows('Workers', [
      FULL_HEADERS,
      fullRow('A-1', 25),
    ])

    expect(preview.errors).toEqual([])
    expect(preview.workers).toHaveLength(1)
    expect(preview.workers[0]).toMatchObject({
      id: 'A-1',
      firstName: 'Avery',
      lastName: 'Reyes',
      middleName: '',
    })
    expect(preview.workers[0].monthlyMinutes.jan).toBe(25)
  })

  it('accepts Name 1, Name 2, Name 3 and # aliases', () => {
    const preview = parseSheetRows('Workers', [
      ['#', 'Name 1', 'Name 2', 'Name 3', 'Jan'],
      ['A-1', 'Reyes', 'Avery', 'Ann', 12],
    ])

    expect(preview.errors).toEqual([])
    expect(preview.workers[0]).toMatchObject({
      id: 'A-1',
      lastName: 'Reyes',
      firstName: 'Avery',
      middleName: 'Ann',
    })
    expect(preview.workers[0].monthlyMinutes.jan).toBe(12)
  })

  it('treats blank month cells as zero and parses numeric strings', () => {
    const preview = parseSheetRows('Workers', [
      ['Employee ID', 'Last Name', 'First Name', 'January', 'February'],
      ['A-1', 'Reyes', 'Avery', '18', null],
    ])

    expect(preview.errors).toEqual([])
    expect(preview.workers[0].monthlyMinutes.jan).toBe(18)
    expect(preview.workers[0].monthlyMinutes.feb).toBe(0)
  })

  it('warns about months missing from the header', () => {
    const preview = parseSheetRows('Workers', [
      ['Employee ID', 'Last Name', 'First Name', 'January'],
      ['A-1', 'Reyes', 'Avery', 5],
    ])

    expect(preview.warnings).toHaveLength(1)
    expect(preview.warnings[0].message).toContain('Missing months treated as zero')
  })

  it('reports a missing required column', () => {
    const preview = parseSheetRows('Workers', [['Name', 'January']])

    expect(preview.workers).toEqual([])
    expect(preview.errors.map((error) => error.column)).toEqual(
      expect.arrayContaining(['Employee ID', 'Last Name', 'First Name']),
    )
  })

  it('reports a sheet without any month column', () => {
    const preview = parseSheetRows('Workers', [
      ['Employee ID', 'Last Name', 'First Name', 'Total'],
      ['A-1', 'Reyes', 'Avery', 30],
    ])

    expect(preview.workers).toEqual([])
    expect(preview.errors.map((error) => error.column)).toContain('Months')
  })

  it('rejects a blank required value and skips the row', () => {
    const preview = parseSheetRows('Workers', [
      ['Employee ID', 'Last Name', 'First Name', 'January'],
      ['', 'Reyes', 'Avery', 5],
    ])

    expect(preview.workers).toEqual([])
    expect(preview.errors).toContainEqual(
      expect.objectContaining({
        row: 2,
        column: 'Employee ID',
        message: 'Employee ID is required.',
      }),
    )
  })

  it('rejects duplicate employee IDs regardless of case', () => {
    const preview = parseSheetRows('Workers', [
      ['Employee ID', 'Last Name', 'First Name', 'January'],
      ['A-1', 'Reyes', 'Avery', 5],
      ['a-1', 'Bautista', 'Jordan', 7],
    ])

    expect(preview.workers).toHaveLength(1)
    expect(preview.errors).toContainEqual(
      expect.objectContaining({ message: 'Employee ID is duplicated.' }),
    )
  })

  it.each([
    ['a negative value', -5],
    ['a decimal value', 12.5],
  ])('rejects %s', (_label, value) => {
    const preview = parseSheetRows('Workers', [
      ['Employee ID', 'Last Name', 'First Name', 'January'],
      ['A-1', 'Reyes', 'Avery', value],
    ])

    expect(preview.workers).toEqual([])
    expect(preview.errors).toContainEqual(
      expect.objectContaining({
        column: 'JAN',
        message: 'Late minutes must be a whole number of zero or more.',
      }),
    )
  })

  it('skips blank rows', () => {
    const preview = parseSheetRows('Workers', [
      ['Employee ID', 'Last Name', 'First Name', 'January'],
      ['A-1', 'Reyes', 'Avery', 5],
      [null, ' ', '', null],
    ])

    expect(preview.workers).toHaveLength(1)
    expect(preview.errors).toEqual([])
  })

  it('finds the header row below a title row', () => {
    const preview = parseSheetRows('Workers', [
      ['Monthly lateness report', null, null, null],
      ['Employee ID', 'Last Name', 'First Name', 'January'],
      ['A-1', 'Reyes', 'Avery', 9],
    ])

    expect(preview.workers).toHaveLength(1)
    expect(preview.workers[0].monthlyMinutes.jan).toBe(9)
  })

  it('reports a sheet with no header row', () => {
    const preview = parseSheetRows('Workers', [[null, null]])

    expect(preview.errors).toContainEqual(
      expect.objectContaining({ message: 'Sheet has no header row.' }),
    )
  })
})
