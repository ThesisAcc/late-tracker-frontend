import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAuthToken, setAuthToken } from './auth'
import {
  downloadResetBackup,
  executeReset,
  fetchResetPreview,
  type ResetPreviewResponse,
} from './resetApi'

describe('resetApi', () => {
  beforeEach(() => {
    localStorage.clear()
    clearAuthToken()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('fetchResetPreview', () => {
    it('calls GET /api/admin/reset/preview with auth headers', async () => {
      setAuthToken('admin-token-123')
      const mockPreview: ResetPreviewResponse = {
        summary: {
          nonAdminUsersCount: 12,
          nonAdminEmployeesCount: 12,
          attendanceRecordsCount: 168,
          importsCount: 4,
          importIssuesCount: 1,
        },
        users: [],
        employees: [],
        attendanceRecords: [],
        imports: [],
        importIssues: [],
      }

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockPreview,
      })
      vi.stubGlobal('fetch', fetchMock)

      const result = await fetchResetPreview()

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, options] = fetchMock.mock.calls[0]
      expect(url).toContain('/api/admin/reset/preview')
      expect(options.headers).toEqual({ Authorization: 'Bearer admin-token-123' })
      expect(result).toEqual(mockPreview)
    })

    it('throws error when server responds with failure', async () => {
      setAuthToken('admin-token-123')
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ message: 'Forbidden: Admin access required' }),
      })
      vi.stubGlobal('fetch', fetchMock)

      await expect(fetchResetPreview()).rejects.toThrow('Forbidden: Admin access required')
    })
  })

  describe('executeReset', () => {
    it('calls DELETE /api/admin/reset with confirm payload and auth headers', async () => {
      setAuthToken('admin-token-123')
      const mockResult = { message: 'Reset successful' }

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResult,
      })
      vi.stubGlobal('fetch', fetchMock)

      const result = await executeReset()

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, options] = fetchMock.mock.calls[0]
      expect(url).toContain('/api/admin/reset')
      expect(options.method).toBe('DELETE')
      expect(options.headers).toEqual({
        Authorization: 'Bearer admin-token-123',
        'Content-Type': 'application/json',
      })
      expect(JSON.parse(options.body)).toEqual({
        confirm: 'RESET_NON_ADMIN_DATA',
      })
      expect(result).toEqual(mockResult)
    })
  })

  describe('downloadResetBackup', () => {
    it('creates object URL and triggers JSON file download', () => {
      const createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost/backup-blob')
      const revokeObjectURLMock = vi.fn()
      window.URL.createObjectURL = createObjectURLMock
      window.URL.revokeObjectURL = revokeObjectURLMock

      const clickMock = vi.fn()
      const originalCreateElement = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const el = originalCreateElement(tagName)
        if (tagName === 'a') {
          el.click = clickMock
        }
        return el
      })

      const sampleData: ResetPreviewResponse = {
        summary: {
          nonAdminUsersCount: 2,
          nonAdminEmployeesCount: 2,
          attendanceRecordsCount: 10,
          importsCount: 1,
          importIssuesCount: 0,
        },
        users: [],
        employees: [],
        attendanceRecords: [],
        imports: [],
        importIssues: [],
      }

      downloadResetBackup(sampleData)

      expect(createObjectURLMock).toHaveBeenCalledTimes(1)
      expect(clickMock).toHaveBeenCalledTimes(1)
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:http://localhost/backup-blob')
    })
  })
})
