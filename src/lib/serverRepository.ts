import { getAuthHeaders, getAuthUser } from './auth'
import type {
  AttendanceRepository,
  ImportSelection,
  RepositoryOutcome,
} from './dataSource'
import {
  fetchMyDashboard,
  type EmployeeDashboardResponse,
} from './dashboardApi'
import {
  apiWorkerToWorker,
  executeImport,
  type ImportWorkerApi,
} from './importsApi'
import { MONTHS } from './months'
import type { MonthlyMinutes, TrackerData, Worker } from './types'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

function makeTrackerData(
  workers: ImportWorkerApi[],
  fileName: string,
  sheetName: string,
): TrackerData {
  return {
    version: 1,
    source: 'server',
    fileName,
    sheetName,
    importedAt: new Date().toISOString(),
    workers: workers.map(apiWorkerToWorker),
  }
}

interface DashboardMonthlyBreakdown {
  month?: number
  monthName?: string
  minutesLate?: number
}

interface DashboardEmployeeApi {
  employeeCode?: string
  id?: string
  firstName?: string
  middleName?: string | null
  lastName?: string
  monthlyBreakdown?: DashboardMonthlyBreakdown[]
  monthlyMinutes?: Record<string, number>
}

function employeeDashboardToTrackerData(
  dashboard: EmployeeDashboardResponse,
): TrackerData {
  const monthlyMinutes: Record<string, number> = {}
  for (const m of MONTHS) {
    monthlyMinutes[m.key] = 0
  }

  // Map the monthlyBreakdown array to our MonthlyMinutes structure
  for (const item of dashboard.monthlyBreakdown) {
    if (item.month >= 1 && item.month <= 12) {
      const monthKey = MONTHS[item.month - 1]?.key
      if (monthKey) {
        monthlyMinutes[monthKey] = item.minutesLate
      }
    }
  }

  const worker: Worker = {
    id: dashboard.employee.employeeCode,
    firstName: dashboard.employee.firstName,
    middleName: dashboard.employee.middleName,
    lastName: dashboard.employee.lastName,
    monthlyMinutes: monthlyMinutes as MonthlyMinutes,
  }

  return {
    version: 1,
    source: 'server',
    importedAt: new Date().toISOString(),
    workers: [worker],
  }
}

export function createServerRepository(): AttendanceRepository {
  return {
    /** Load the latest attendance data from the server dashboard API. */
    async load(): Promise<TrackerData> {
      const user = getAuthUser()
      
      // If user is an employee (not admin/manager), fetch their personal dashboard
      if (user && user.role !== 'admin' && user.role !== 'manager') {
        const dashboard = await fetchMyDashboard()
        return employeeDashboardToTrackerData(dashboard)
      }

      // For managers/admins, fetch the full admin dashboard
      const year = new Date().getFullYear()
      const res = await fetch(`${API_BASE}/api/admin/dashboard?year=${year}`, {
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        throw new Error('Failed to load attendance data from server')
      }

      const json = await res.json()
      const rawEmployees = (json.employees ??
        json.data?.employees ??
        json.workers ??
        []) as DashboardEmployeeApi[]

      // Map AdminDashboard employees → frontend Worker shape.
      const workers: Worker[] = rawEmployees.map((emp) => {
        const monthlyMinutes: Record<string, number> = {}
        for (const m of MONTHS) {
          monthlyMinutes[m.key] = 0
        }

        if (Array.isArray(emp.monthlyBreakdown)) {
          for (const b of emp.monthlyBreakdown) {
            let monthKey: string | undefined
            if (typeof b.month === 'number' && b.month >= 1 && b.month <= 12) {
              monthKey = MONTHS[b.month - 1]?.key
            } else if (b.monthName) {
              monthKey = MONTHS.find(
                (m) =>
                  m.label.toLowerCase() === String(b.monthName).toLowerCase(),
              )?.key
            }

            if (monthKey) {
              monthlyMinutes[monthKey] = Number(b.minutesLate ?? 0)
            }
          }
        } else if (emp.monthlyMinutes && typeof emp.monthlyMinutes === 'object') {
          for (const m of MONTHS) {
            const val =
              emp.monthlyMinutes[m.label.toLowerCase()] ??
              emp.monthlyMinutes[m.key]
            if (val !== undefined) {
              monthlyMinutes[m.key] = Number(val)
            }
          }
        }

        return {
          id: emp.employeeCode ?? emp.id ?? '',
          firstName: emp.firstName ?? '',
          middleName: emp.middleName ?? '',
          lastName: emp.lastName ?? '',
          monthlyMinutes: monthlyMinutes as MonthlyMinutes,
        }
      })

      return {
        version: 1,
        source: 'server',
        importedAt: new Date().toISOString(),
        workers,
      }
    },

    /** Execute an import and return the resulting TrackerData. */
    async applyImport(selection: ImportSelection): Promise<RepositoryOutcome> {
      const file = selection.file
      const year = selection.year ?? new Date().getFullYear()

      if (!file) {
        return {
          data: {
            version: 1,
            source: 'server',
            fileName: selection.fileName,
            sheetName: selection.sheetName,
            importedAt: new Date().toISOString(),
            workers: selection.workers,
          },
          persisted: true,
        }
      }

      const result = await executeImport(file, year, selection.sheetName)
      const data = makeTrackerData(
        result.workers ?? [],
        result.fileName ?? selection.fileName,
        result.sheetName ?? selection.sheetName,
      )
      return { data, persisted: true }
    },

    async restoreDemo(): Promise<RepositoryOutcome> {
      throw new Error('Restore demo is not available in server mode.')
    },
  }
}
