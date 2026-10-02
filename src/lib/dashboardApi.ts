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

function getDevBypassUser() {
  if (typeof window === 'undefined') return null
  const userJson = localStorage.getItem('latetrack-auth-user')
  if (!userJson) return null
  try {
    return JSON.parse(userJson)
  } catch {
    return null
  }
}

function isDevBypassActive(): boolean {
  return import.meta.env.DEV && getDevBypassUser() !== null
}

function createMockDashboardResponse(): EmployeeDashboardResponse {
  const user = getDevBypassUser()
  const isAdmin = user?.role === 'ADMIN'
  const employeeCode = isAdmin ? 'ADM-001' : 'EMP-001'
  const firstName = isAdmin ? 'Admin' : 'Worker'
  const lastName = isAdmin ? 'User' : 'One'

  // Sample monthly data - some months with late minutes
  const monthlyData: MonthlyBreakdownItem[] = [
    { month: 1, monthName: 'January', minutesLate: 0 },
    { month: 2, monthName: 'February', minutesLate: 15 },
    { month: 3, monthName: 'March', minutesLate: 0 },
    { month: 4, monthName: 'April', minutesLate: 30 },
    { month: 5, monthName: 'May', minutesLate: 0 },
    { month: 6, monthName: 'June', minutesLate: 45 },
    { month: 7, monthName: 'July', minutesLate: 0 },
    { month: 8, monthName: 'August', minutesLate: 20 },
    { month: 9, monthName: 'September', minutesLate: 0 },
    { month: 10, monthName: 'October', minutesLate: 0 },
    { month: 11, monthName: 'November', minutesLate: 0 },
    { month: 12, monthName: 'December', minutesLate: 0 },
  ]

  const totalMinutesLate = monthlyData.reduce((sum, m) => sum + m.minutesLate, 0)
  const monthsWithLateness = monthlyData.filter((m) => m.minutesLate > 0).length
  const highest = monthlyData.reduce((max, m) => (m.minutesLate > max.minutesLate ? m : max), monthlyData[0])

  return {
    employee: {
      id: user?.employee?.id ?? 'dev-emp-employee',
      employeeCode,
      firstName,
      middleName: '',
      lastName,
    },
    year: new Date().getFullYear(),
    summary: {
      totalMinutesLate,
      averageMinutesLatePerMonth: monthsWithLateness > 0 ? totalMinutesLate / monthsWithLateness : 0,
      monthsWithLatenessCount: monthsWithLateness,
      highestLateMonth: {
        month: highest.month,
        monthName: highest.monthName,
        minutesLate: highest.minutesLate,
      },
    },
    monthlyBreakdown: monthlyData,
  }
}

export async function fetchMyDashboard(): Promise<EmployeeDashboardResponse> {
  // Return mock data in dev mode with dev bypass active
  if (isDevBypassActive()) {
    return createMockDashboardResponse()
  }

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
