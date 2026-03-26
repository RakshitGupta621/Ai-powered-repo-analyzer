import axios from 'axios'
import * as api from '@/lib/api'
import type { Project, IngestionJob, QueryResult } from '@/types'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Projects', () => {
    it('should create a project', async () => {
      const mockProject: Project = {
        id: '123',
        name: 'Test Project',
        status: 'pending',
        chunkCount: 0,
        fileCount: 0,
        fileTree: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      mockedAxios.post.mockResolvedValue({
        data: { success: true, message: '', data: mockProject },
      })

      const result = await api.createProject('Test Project')
      expect(result).toEqual(mockProject)
      expect(mockedAxios.post).toHaveBeenCalledWith('/projects', {
        name: 'Test Project',
        repoUrl: undefined,
      })
    })

    it('should list projects', async () => {
      const mockProjects: Project[] = [
        {
          id: '1',
          name: 'Project 1',
          status: 'ready',
          chunkCount: 100,
          fileCount: 50,
          fileTree: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]

      mockedAxios.get.mockResolvedValue({
        data: { success: true, message: '', data: mockProjects },
      })

      const result = await api.listProjects()
      expect(result).toEqual(mockProjects)
      expect(mockedAxios.get).toHaveBeenCalledWith('/projects')
    })

    it('should get a single project', async () => {
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

      mockedAxios.get.mockResolvedValue({
        data: { success: true, message: '', data: mockProject },
      })

      const result = await api.getProject('123')
      expect(result).toEqual(mockProject)
      expect(mockedAxios.get).toHaveBeenCalledWith('/projects/123')
    })

    it('should delete a project', async () => {
      mockedAxios.delete.mockResolvedValue({ data: { success: true } })

      await api.deleteProject('123')
      expect(mockedAxios.delete).toHaveBeenCalledWith('/projects/123')
    })
  })

  describe('Query', () => {
    it('should query a project', async () => {
      const mockResult: QueryResult = {
        answer: 'This is the answer',
        retrieved_chunks: [],
        project_id: '123',
        cached: false,
      }

      mockedAxios.post.mockResolvedValue({
        data: { success: true, message: '', data: mockResult },
      })

      const result = await api.queryProject('123', 'What is this project?')
      expect(result).toEqual(mockResult)
      expect(mockedAxios.post).toHaveBeenCalledWith('/query', {
        projectId: '123',
        question: 'What is this project?',
        topK: null,
      })
    })

    it('should handle query errors', async () => {
      mockedAxios.post.mockRejectedValue(
        new Error('Query failed')
      )

      await expect(api.queryProject('123', 'test')).rejects.toThrow('Query failed')
    })
  })

  describe('Ingestion', () => {
    it('should get job status', async () => {
      const mockJob: IngestionJob = {
        jobId: 'job-123',
        state: 'completed',
        progress: 100,
      }

      mockedAxios.get.mockResolvedValue({
        data: { success: true, message: '', data: mockJob },
      })

      const result = await api.getJobStatus('job-123')
      expect(result).toEqual(mockJob)
      expect(mockedAxios.get).toHaveBeenCalledWith('/ingest/job-123/status')
    })
  })

  describe('Chat', () => {
    it('should get chat history', async () => {
      const mockHistory = {
        messages: [
          { role: 'user', content: 'Hello', timestamp: new Date().toISOString() },
        ],
      }

      mockedAxios.get.mockResolvedValue({
        data: { success: true, message: '', data: mockHistory },
      })

      const result = await api.getChatHistory('123')
      expect(result).toEqual(mockHistory.messages)
      expect(mockedAxios.get).toHaveBeenCalledWith('/chat/123')
    })

    it('should clear chat history', async () => {
      mockedAxios.delete.mockResolvedValue({ data: { success: true } })

      await api.clearChatHistory('123')
      expect(mockedAxios.delete).toHaveBeenCalledWith('/chat/123')
    })
  })

  describe('Files', () => {
    it('should get file tree', async () => {
      const mockTree = {
        name: 'root',
        type: 'dir',
        children: [],
      }

      mockedAxios.get.mockResolvedValue({
        data: { success: true, message: '', data: mockTree },
      })

      const result = await api.getFileTree('123')
      expect(result).toEqual(mockTree)
      expect(mockedAxios.get).toHaveBeenCalledWith('/files/123')
    })
  })
})
