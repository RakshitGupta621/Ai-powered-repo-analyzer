import { renderHook, act, waitFor } from '@testing-library/react'
import * as api from '@/lib/api'
import { useProjects } from '@/hooks/useProjects'
import toast from 'react-hot-toast'
import type { Project } from '@/types'

jest.mock('@/lib/api')
jest.mock('react-hot-toast')

const mockApi = api as jest.Mocked<typeof api>
const mockToast = toast as jest.Mocked<typeof toast>

describe('useProjects', () => {
  const mockProject: Project = {
    id: '123',
    name: 'Test Project',
    status: 'ready',
    chunkCount: 100,
    fileCount: 50,
    fileTree: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch projects on mount', async () => {
    mockApi.listProjects.mockResolvedValue([mockProject])

    const { result } = renderHook(() => useProjects())

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.projects).toEqual([mockProject])
    expect(mockApi.listProjects).toHaveBeenCalled()
  })

  it('should handle fetch errors', async () => {
    mockApi.listProjects.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useProjects())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Network error')
    expect(result.current.projects).toEqual([])
  })

  it('should create a project', async () => {
    const newProject: Project = { ...mockProject, id: '456' }
    mockApi.createProject.mockResolvedValue(newProject)

    const { result } = renderHook(() => useProjects())

    await act(async () => {
      const created = await result.current.create('New Project')
      expect(created).toEqual(newProject)
    })

    expect(result.current.projects).toContain(newProject)
    expect(mockToast.success).toHaveBeenCalledWith('Project created successfully')
  })

  it('should handle project creation errors', async () => {
    mockApi.createProject.mockRejectedValue(new Error('Create failed'))

    const { result } = renderHook(() => useProjects())

    await act(async () => {
      const created = await result.current.create('New Project')
      expect(created).toBeNull()
    })

    expect(mockToast.error).toHaveBeenCalledWith('Create failed')
  })

  it('should delete a project', async () => {
    mockApi.listProjects.mockResolvedValue([mockProject])
    mockApi.deleteProject.mockResolvedValue(undefined)

    const { result } = renderHook(() => useProjects())

    await waitFor(() => {
      expect(result.current.projects.length).toBe(1)
    })

    await act(async () => {
      await result.current.remove('123')
    })

    expect(result.current.projects).toEqual([])
    expect(mockToast.success).toHaveBeenCalledWith('Project deleted')
  })

  it('should handle delete errors', async () => {
    mockApi.listProjects.mockResolvedValue([mockProject])
    mockApi.deleteProject.mockRejectedValue(new Error('Delete failed'))

    const { result } = renderHook(() => useProjects())

    await waitFor(() => {
      expect(result.current.projects.length).toBe(1)
    })

    await act(async () => {
      try {
        await result.current.remove('123')
      } catch (e) {
        // Error handled
      }
    })

    expect(mockToast.error).toHaveBeenCalledWith('Delete failed')
  })

  it('should refetch projects', async () => {
    mockApi.listProjects.mockResolvedValue([mockProject])

    const { result } = renderHook(() => useProjects())

    await waitFor(() => {
      expect(mockApi.listProjects).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      await result.current.refetch()
    })

    expect(mockApi.listProjects).toHaveBeenCalledTimes(2)
  })
})
