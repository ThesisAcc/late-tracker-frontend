import { getAuthHeaders } from './auth'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export interface EmployeeDashboardEmployee {
  id: string
  employeeCode: string
  firstName: string
  middleName: string
  lastName: string
}

export interface HighestLateMonth {
  month: number
  monthName: string
  minutesLate: number
}

export interface EmployeeDashboardSummary {
  totalMinutesLate: number
  averageMinutesLatePerMonth: number
  monthsWithLatenessCount: number
  highestLateMonth: HighestLateMonth
}

export interface MonthlyBreakdownItem {
  month: number
  monthName: string
  minutesLate: number
}

export interface EmployeeDashboardResponse {
  employee: EmployeeDashboardEmployee
  year: number
  summary: EmployeeDashboardSummary
  monthlyBreakdown: MonthlyBreakdownItem[]
}

export class DashboardError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'DashboardError'
    this.status = status
  }
}

export async function fetchMyDashboard(): Promise<EmployeeDashboardResponse> {
  const response = await fetch(`${API_BASE}/api/dashboard/my-stats`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new DashboardError('Authentication required', 401)
    }
    if (response.status === 403) {
      throw new DashboardError('Access denied', 403)
    }
    throw new DashboardError('Failed to fetch dashboard data', response.status)
  }

  let body: Partial<EmployeeDashboardResponse> = {}
  try {
    body = await response.json()
  } catch {
    throw new DashboardError('Invalid response from server', 502)
  }

  if (!body.employee || !body.summary || !body.monthlyBreakdown) {
    throw new DashboardError('Invalid dashboard response structure', 502)
  }

  return body as EmployeeDashboardResponse
}
