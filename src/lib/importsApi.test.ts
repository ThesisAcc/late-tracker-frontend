import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAuthToken, setAuthToken } from './auth'
import {
  apiWorkerToWorker,
  downloadTemplate,
  executeImport,
  getImportDetails,
  getImportsList,
  previewImport,
  type ImportWorkerApi,
} from './importsApi'

describe('importsApi', () => {
  beforeEach(() => {
    localStorage.clear()
    clearAuthToken()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('apiWorkerToWorker', () => {
    it('maps backend worker to frontend worker shape with all 12 month keys', () => {
      const backendWorker: ImportWorkerApi = {
        employeeCode: 'EMP-001',
        firstName: 'Alex',
        middleName: 'M',
        lastName: 'Reyes',
        isNewEmployee: false,
        totalMinutes: 45,
        monthlyMinutes: {
          january: 15,
          february: 30,
        },
      }

      const worker = apiWorkerToWorker(backendWorker)

      expect(worker.id).toBe('EMP-001')
      expect(worker.firstName).toBe('Alex')
      expect(worker.middleName).toBe('M')
      expect(worker.lastName).toBe('Reyes')
      expect(worker.monthlyMinutes.jan).toBe(15)
      expect(worker.monthlyMinutes.feb).toBe(30)
      expect(worker.monthlyMinutes.mar).toBe(0)
      expect(worker.monthlyMinutes.dec).toBe(0)
    })

    it('handles null middleName', () => {
      const backendWorker: ImportWorkerApi = {
        employeeCode: 'EMP-002',
        firstName: 'Jane',
        middleName: null,
        lastName: 'Doe',
        isNewEmployee: true,
        totalMinutes: 0,
        monthlyMinutes: {},
      }

      const worker = apiWorkerToWorker(backendWorker)
      expect(worker.middleName).toBe('')
    })
  })

  describe('previewImport', () => {
    it('sends formData with file and year, returning preview response', async () => {
      setAuthToken('token-123')
      const mockPreviewResponse = {
        isValid: true,
        fileName: 'attendance.xlsx',
        sheetName: 'Sheet1',
        year: 2026,
        availableSheets: ['Sheet1'],
        summary: {
          totalRows: 10,
          validWorkers: 10,
          totalMinutesLate: 120,
          newEmployeesCount: 1,
          existingEmployeesCount: 9,
          conflictsCount: 0,
          errorsCount: 0,
          warningsCount: 0,
        },
        issues: [],
        workers: [],
      }

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockPreviewResponse,
      })
      vi.stubGlobal('fetch', fetchMock)

      const file = new File(['dummy content'], 'attendance.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })

      const result = await previewImport(file, 2026, 'Sheet1', true)

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, options] = fetchMock.mock.calls[0]
      expect(url).toContain('/api/admin/imports/preview')
      expect(options.method).toBe('POST')
      expect(options.headers).toEqual({ Authorization: 'Bearer token-123' })
      expect(options.body).toBeInstanceOf(FormData)
      expect(result).toEqual(mockPreviewResponse)
    })

    it('throws error with details on 422 failure', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({
          error: 'ValidationError',
          message: 'Workbook contains validation errors. Import aborted.',
          details: {
            totalErrors: 1,
            errors: [
              {
                row: 5,
                column: 'March',
                issueType: 'INVALID_MINUTES',
                message: 'Invalid minutes value',
              },
            ],
          },
        }),
      })
      vi.stubGlobal('fetch', fetchMock)

      const file = new File(['dummy'], 'test.xlsx')
      await expect(previewImport(file, 2026)).rejects.toThrow(
        'Workbook contains validation errors. Import aborted.',
      )
    })
  })

  describe('executeImport', () => {
    it('commits import to backend', async () => {
      setAuthToken('token-abc')
      const mockImportResponse = {
        importId: 'imp-101',
        status: 'SUCCESS',
        fileName: 'upload.xlsx',
        sheetName: 'Workers',
        year: 2026,
        importedAt: new Date().toISOString(),
        summary: {
          employeesCreated: 2,
          employeesExisting: 5,
          recordsUpserted: 7,
          totalMinutesLate: 100,
          issuesLogged: 0,
          warningsCount: 0,
        },
        issues: [],
        workers: [],
      }

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockImportResponse,
      })
      vi.stubGlobal('fetch', fetchMock)

      const file = new File(['content'], 'upload.xlsx')
      const result = await executeImport(file, 2026, 'Workers')

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, options] = fetchMock.mock.calls[0]
      expect(url).toContain('/api/admin/imports')
      expect(options.method).toBe('POST')
      expect(options.headers).toEqual({ Authorization: 'Bearer token-abc' })
      expect(result).toEqual(mockImportResponse)
    })
  })

  describe('downloadTemplate', () => {
    it('fetches template with auth headers and triggers blob download', async () => {
      setAuthToken('token-admin')
      const createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost/mock-blob')
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

      const mockBlob = new Blob(['sample-data'])
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({
          'content-disposition': 'attachment; filename="custom_template.xlsx"',
        }),
        blob: async () => mockBlob,
      })
      vi.stubGlobal('fetch', fetchMock)

      await downloadTemplate()

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, options] = fetchMock.mock.calls[0]
      expect(url).toContain('/api/admin/imports/template')
      expect(options.headers).toEqual({ Authorization: 'Bearer token-admin' })
      expect(createObjectURLMock).toHaveBeenCalledWith(mockBlob)
      expect(clickMock).toHaveBeenCalledTimes(1)
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:http://localhost/mock-blob')
    })
  })

  describe('getImportsList and getImportDetails', () => {
    it('fetches imports history', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ id: '1', fileName: 'data.xlsx' }],
      })
      vi.stubGlobal('fetch', fetchMock)

      const list = await getImportsList()
      expect(list).toEqual([{ id: '1', fileName: 'data.xlsx' }])
    })

    it('fetches import details', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ import: { id: '1' }, issues: [] }),
      })
      vi.stubGlobal('fetch', fetchMock)

      const details = await getImportDetails('1')
      expect(details).toEqual({ import: { id: '1' }, issues: [] })
    })
  })
})
