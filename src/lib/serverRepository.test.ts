import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAuthToken, setAuthToken } from './auth'
import { createServerRepository } from './serverRepository'

describe('serverRepository', () => {
  beforeEach(() => {
    localStorage.clear()
    clearAuthToken()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('load', () => {
    it('fetches dashboard data and maps employees to Worker shape', async () => {
      setAuthToken('token-jwt')
      const mockDashboard = {
        employees: [
          {
            employeeCode: 'EMP-01',
            firstName: 'Maria',
            middleName: 'G',
            lastName: 'Santos',
            monthlyBreakdown: [
              { month: 1, monthName: 'January', minutesLate: 10 },
              { month: 3, monthName: 'March', minutesLate: 25 },
            ],
          },
        ],
      }

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockDashboard,
      })
      vi.stubGlobal('fetch', fetchMock)

      const repo = createServerRepository()
      const data = await repo.load()

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, options] = fetchMock.mock.calls[0]
      expect(url).toContain('/api/admin/dashboard?year=')
      expect(options.headers).toEqual({ Authorization: 'Bearer token-jwt' })

      expect(data.source).toBe('server')
      expect(data.workers).toHaveLength(1)
      expect(data.workers[0].id).toBe('EMP-01')
      expect(data.workers[0].firstName).toBe('Maria')
      expect(data.workers[0].monthlyMinutes.jan).toBe(10)
      expect(data.workers[0].monthlyMinutes.feb).toBe(0)
      expect(data.workers[0].monthlyMinutes.mar).toBe(25)
    })

    it('throws when server request fails', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      })
      vi.stubGlobal('fetch', fetchMock)

      const repo = createServerRepository()
      await expect(repo.load()).rejects.toThrow(
        'Failed to load attendance data from server',
      )
    })
  })

  describe('applyImport', () => {
    it('executes import with file and maps returned workers', async () => {
      const mockImportResponse = {
        importId: '123',
        status: 'SUCCESS',
        fileName: 'imported.xlsx',
        sheetName: 'Sheet1',
        year: 2026,
        importedAt: new Date().toISOString(),
        summary: {
          employeesCreated: 1,
          employeesExisting: 0,
          recordsUpserted: 1,
          totalMinutesLate: 15,
          issuesLogged: 0,
          warningsCount: 0,
        },
        issues: [],
        workers: [
          {
            employeeCode: 'EMP-99',
            firstName: 'Carlos',
            middleName: '',
            lastName: 'Tan',
            isNewEmployee: true,
            totalMinutes: 15,
            monthlyMinutes: { january: 15 },
          },
        ],
      }

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockImportResponse,
      })
      vi.stubGlobal('fetch', fetchMock)

      const repo = createServerRepository()
      const dummyFile = new File(['data'], 'imported.xlsx')

      const outcome = await repo.applyImport({
        fileName: 'imported.xlsx',
        sheetName: 'Sheet1',
        file: dummyFile,
        year: 2026,
        workers: [],
      })

      expect(outcome.persisted).toBe(true)
      expect(outcome.data.source).toBe('server')
      expect(outcome.data.fileName).toBe('imported.xlsx')
      expect(outcome.data.workers).toHaveLength(1)
      expect(outcome.data.workers[0].id).toBe('EMP-99')
      expect(outcome.data.workers[0].monthlyMinutes.jan).toBe(15)
    })

    it('handles selection without a file gracefully', async () => {
      const repo = createServerRepository()
      const outcome = await repo.applyImport({
        fileName: 'manual.xlsx',
        sheetName: 'Sheet1',
        workers: [
          {
            id: '1',
            firstName: 'A',
            middleName: '',
            lastName: 'B',
            monthlyMinutes: {
              jan: 0,
              feb: 0,
              mar: 0,
              apr: 0,
              may: 0,
              jun: 0,
              jul: 0,
              aug: 0,
              sep: 0,
              oct: 0,
              nov: 0,
              dec: 0,
            },
          },
        ],
      })

      expect(outcome.persisted).toBe(true)
      expect(outcome.data.source).toBe('server')
      expect(outcome.data.workers).toHaveLength(1)
    })
  })

  describe('restoreDemo', () => {
    it('throws error indicating restore demo is not available in server mode', async () => {
      const repo = createServerRepository()
      await expect(repo.restoreDemo()).rejects.toThrow(
        'Restore demo is not available in server mode.',
      )
    })
  })
})
