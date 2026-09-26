import { createEmptyMonthlyMinutes } from './calculations'
import type { TrackerData, Worker } from './types'

type RosterEntry = Omit<Worker, 'monthlyMinutes'> & {
  monthlyMinutes: Partial<Worker['monthlyMinutes']>
}

const roster: RosterEntry[] = [
  {
    id: 'DEMO-1001',
    lastName: 'Reyes',
    firstName: 'Avery',
    middleName: '',
    monthlyMinutes: { jan: 24, feb: 12, mar: 0, apr: 35, may: 18, jun: 9, jul: 0, aug: 16, sep: 22 },
  },
  {
    id: 'DEMO-1002',
    lastName: 'Bautista',
    firstName: 'Jordan',
    middleName: 'Lee',
    monthlyMinutes: { jan: 41, feb: 0, mar: 28, apr: 16, may: 33, jun: 12, aug: 7, sep: 18 },
  },
  {
    id: 'DEMO-1003',
    lastName: 'Santos',
    firstName: 'Morgan',
    middleName: '',
    monthlyMinutes: { jan: 0, feb: 18, mar: 44, apr: 9, may: 0, jun: 26, jul: 14, aug: 0, sep: 31 },
  },
  {
    id: 'DEMO-1004',
    lastName: 'Cruz',
    firstName: 'Riley',
    middleName: 'Ann',
    monthlyMinutes: { jan: 13, feb: 27, mar: 8, apr: 0, may: 21, jun: 0, jul: 29, aug: 13, sep: 0 },
  },
  {
    id: 'DEMO-1005',
    lastName: 'Lopez',
    firstName: 'Casey',
    middleName: '',
    monthlyMinutes: { jan: 0, feb: 0, mar: 19, apr: 32, may: 14, jun: 0, jul: 0, aug: 38, sep: 12 },
  },
  {
    id: 'DEMO-1006',
    lastName: 'Villanueva',
    firstName: 'Taylor',
    middleName: 'Grace',
    monthlyMinutes: { jan: 7, feb: 11, mar: 0, apr: 23, may: 9, jun: 17, jul: 0, aug: 0, sep: 26 },
  },
  {
    id: 'DEMO-1007',
    lastName: 'Okafor',
    firstName: 'Alexis',
    middleName: '',
    monthlyMinutes: { jan: 22, feb: 0, mar: 15, apr: 0, may: 36, jun: 0, jul: 18, aug: 25, sep: 0 },
  },
  {
    id: 'DEMO-1008',
    lastName: 'Navarro',
    firstName: 'Jamie',
    middleName: 'P.',
    monthlyMinutes: { jan: 0, feb: 5, mar: 0, apr: 11, may: 0, jun: 20, jul: 0, aug: 9, sep: 0 },
  },
  {
    id: 'DEMO-1009',
    lastName: 'Delgado',
    firstName: 'Noor',
    middleName: 'A.',
    monthlyMinutes: { jan: 6, feb: 3, mar: 11, apr: 8, may: 5, jun: 14, jul: 2, aug: 7, sep: 4 },
  },
  {
    id: 'DEMO-1010',
    lastName: 'Fitzgerald',
    firstName: 'Rowan',
    middleName: '',
    monthlyMinutes: { jan: 58, feb: 64, mar: 71, apr: 49, may: 77, jun: 62, jul: 80, aug: 68, sep: 74 },
  },
  {
    id: 'DEMO-1011',
    lastName: 'Ahmed',
    firstName: 'Sami',
    middleName: 'R.',
    monthlyMinutes: { jan: 15, feb: 0, mar: 22, apr: 0, may: 31, jun: 6, jul: 0, aug: 18, sep: 9 },
  },
  {
    id: 'DEMO-1012',
    lastName: 'Kowalski',
    firstName: 'Dani',
    middleName: 'M.',
    monthlyMinutes: { jan: 0, feb: 0, mar: 0, apr: 12, may: 0, jun: 0, jul: 8, aug: 0, sep: 15 },
  },
  {
    id: 'DEMO-1013',
    lastName: 'Mensah',
    firstName: 'Kwame',
    middleName: '',
    monthlyMinutes: { jan: 33, feb: 29, mar: 25, apr: 38, may: 30, jun: 41, jul: 27, aug: 35, sep: 39 },
  },
  {
    id: 'DEMO-1014',
    lastName: 'Ibrahim',
    firstName: 'Layla',
    middleName: 'H.',
    monthlyMinutes: { jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0, jul: 0, aug: 0, sep: 0 },
  },
]

function toWorker(entry: RosterEntry): Worker {
  return {
    ...entry,
    monthlyMinutes: {
      ...createEmptyMonthlyMinutes(),
      ...entry.monthlyMinutes,
    },
  }
}

export function createDemoData(): TrackerData {
  return {
    version: 1,
    source: 'demo',
    workers: roster.map(toWorker),
  }
}
