import { renderHook, act, waitFor } from '@testing-library/react'
import * as api from '@/lib/api'
import { useIngestion, useQuery } from '@/hooks/useIngestion'
import toast from 'react-hot-toast'

jest.mock('@/lib/api')
jest.mock('react-hot-toast')

const mockApi = api as jest.Mocked<typeof api>
const mockToast = toast as jest.Mocked<typeof toast>

describe('useIngestion', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should upload a file and start polling', async () => {
    const mockFile = new File(['test'], 'test.zip', { type: 'application/zip' })
    mockApi.ingestZip.mockResolvedValue({ jobId: 'job-123' })
    mockApi.getJobStatus.mockResolvedValue({
      jobId: 'job-123',
      state: 'active',
      progress: 50,
    })

    const { result } = renderHook(() => useIngestion('project-123'))

    await act(async () => {
      await result.current.startIngestion(mockFile)
    })

    expect(mockApi.ingestZip).toHaveBeenCalledWith(
      'project-123',
      mockFile,
      expect.any(Function)
    )
    expect(result.current.processing).toBe(true)
  })

  it('should handle upload progress', async () => {
    const mockFile = new File(['test'], 'test.zip', { type: 'application/zip' })
    let progressCallback: ((pct: number) => void) | undefined

    mockApi.ingestZip.mockImplementation(
      (_, __, onProgress) => {
        progressCallback = onProgress
        return Promise.resolve({ jobId: 'job-123' })
      }
    )

    const { result } = renderHook(() => useIngestion('project-123'))

    await act(async () => {
      await result.current.startIngestion(mockFile)
    })

    expect(result.current.uploading).toBe(false)
  })

  it('should handle upload errors', async () => {
    const mockFile = new File(['test'], 'test.zip', { type: 'application/zip' })
    mockApi.ingestZip.mockRejectedValue(new Error('Upload failed'))

    const { result } = renderHook(() => useIngestion('project-123'))

    await act(async () => {
      await result.current.startIngestion(mockFile)
    })

    expect(result.current.error).toBe('Upload failed')
    expect(result.current.uploading).toBe(false)
    expect(mockToast.error).toHaveBeenCalledWith('Upload failed')
  })

  it('should complete ingestion when job completes', async () => {
    const mockFile = new File(['test'], 'test.zip', { type: 'application/zip' })
    let pollCount = 0

    mockApi.ingestZip.mockResolvedValue({ jobId: 'job-123' })
    mockApi.getJobStatus.mockImplementation(() => {
      pollCount++
      const states = ['active', 'active', 'completed']
      return Promise.resolve({
        jobId: 'job-123',
        state: states[Math.min(pollCount - 1, 2)] as any,
        progress: Math.min(pollCount * 50, 100),
      })
    })

    const onComplete = jest.fn()
    const { result } = renderHook(() => useIngestion('project-123', onComplete))

    await act(async () => {
      await result.current.startIngestion(mockFile)
    })

    expect(result.current.processing).toBe(true)

    // Simulate polling
    await act(async () => {
      jest.advanceTimersByTime(2000)
    })
  })

  it('should handle ingestion failure', async () => {
    const mockFile = new File(['test'], 'test.zip', { type: 'application/zip' })

    mockApi.ingestZip.mockResolvedValue({ jobId: 'job-123' })
    mockApi.getJobStatus.mockResolvedValue({
      jobId: 'job-123',
      state: 'failed',
      progress: 0,
      failedReason: 'Invalid ZIP file',
    })

    const { result } = renderHook(() => useIngestion('project-123'))

    await act(async () => {
      await result.current.startIngestion(mockFile)
    })

    expect(result.current.processing).toBe(true)

    await act(async () => {
      jest.advanceTimersByTime(2000)
    })
  })
})

describe('useQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should query a project', async () => {
    const mockResult = {
      answer: 'This is the answer',
      retrieved_chunks: [],
      project_id: 'proj-123',
      cached: false,
    }

    mockApi.queryProject.mockResolvedValue(mockResult)

    const { result } = renderHook(() => useQuery('proj-123'))

    const queryResult = await act(async () => {
      return await result.current.ask('What is this?')
    })

    expect(queryResult).toEqual(mockResult)
    expect(result.current.result).toEqual(mockResult)
    expect(result.current.history.length).toBe(1)
  })

  it('should maintain query history', async () => {
    const mockResult1 = {
      answer: 'Answer 1',
      retrieved_chunks: [],
      project_id: 'proj-123',
      cached: false,
    }
    const mockResult2 = {
      answer: 'Answer 2',
      retrieved_chunks: [],
      project_id: 'proj-123',
      cached: false,
    }

    mockApi.queryProject
      .mockResolvedValueOnce(mockResult1)
      .mockResolvedValueOnce(mockResult2)

    const { result } = renderHook(() => useQuery('proj-123'))

    await act(async () => {
      await result.current.ask('Question 1')
      await result.current.ask('Question 2')
    })

    expect(result.current.history.length).toBe(2)
    expect(result.current.history[0].question).toBe('Question 2')
  })

  it('should handle query errors', async () => {
    mockApi.queryProject.mockRejectedValue(new Error('Query failed'))

    const { result } = renderHook(() => useQuery('proj-123'))

    const queryResult = await act(async () => {
      return await result.current.ask('What?')
    })

    expect(queryResult).toBeNull()
    expect(result.current.error).toBe('Query failed')
    expect(mockToast.error).toHaveBeenCalledWith('Query failed')
  })
})
