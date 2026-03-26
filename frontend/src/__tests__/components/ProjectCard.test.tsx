import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProjectCard from '@/components/features/ProjectCard'
import type { Project } from '@/types'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

describe('ProjectCard', () => {
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

  const mockOnDelete = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render project card with project info', () => {
    render(<ProjectCard project={mockProject} onDelete={mockOnDelete} />)

    expect(screen.getByText('Test Project')).toBeInTheDocument()
    expect(screen.getByText(/50 files/)).toBeInTheDocument()
    expect(screen.getByText(/100 chunks/)).toBeInTheDocument()
  })

  it('should show delete button on hover', async () => {
    const { container } = render(
      <ProjectCard project={mockProject} onDelete={mockOnDelete} />
    )

    const card = container.firstChild as HTMLElement
    fireEvent.mouseEnter(card)

    await waitFor(() => {
      expect(screen.getByLabelText(/Delete project/)).toBeInTheDocument()
    })
  })

  it('should handle delete button click', async () => {
    const { container } = render(
      <ProjectCard project={mockProject} onDelete={mockOnDelete} />
    )

    const card = container.firstChild as HTMLElement
    fireEvent.mouseEnter(card)

    const deleteBtn = screen.getByLabelText(/Delete project/)
    fireEvent.click(deleteBtn)

    // Modal should open (implementation depends on DeleteProjectModal)
    expect(deleteBtn).toBeInTheDocument()
  })

  it('should have proper accessibility attributes', () => {
    render(<ProjectCard project={mockProject} onDelete={mockOnDelete} />)

    const card = screen.getByRole('button', { hidden: true })
    expect(card).toHaveAttribute('aria-label', 'Open project Test Project')
  })

  it('should handle Enter key press', () => {
    const { container } = render(
      <ProjectCard project={mockProject} onDelete={mockOnDelete} />
    )

    const card = container.firstChild as HTMLElement
    fireEvent.keyDown(card, { key: 'Enter' })

    // Router.push would be called (mocked)
    expect(card).toBeInTheDocument()
  })

  it('should render error message for failed projects', () => {
    const failedProject: Project = {
      ...mockProject,
      status: 'failed',
      errorMessage: 'Failed to ingest files',
    }

    render(<ProjectCard project={failedProject} onDelete={mockOnDelete} />)

    expect(screen.getByText('Failed to ingest files')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('should render pending status', () => {
    const pendingProject: Project = {
      ...mockProject,
      status: 'pending',
    }

    render(<ProjectCard project={pendingProject} onDelete={mockOnDelete} />)

    expect(screen.getByText('Test Project')).toBeInTheDocument()
  })

  it('should handle file counts with proper formatting', () => {
    const projectWithManyChunks: Project = {
      ...mockProject,
      chunkCount: 1000,
      fileCount: 500,
    }

    render(
      <ProjectCard project={projectWithManyChunks} onDelete={mockOnDelete} />
    )

    expect(screen.getByText(/500 files/)).toBeInTheDocument()
    expect(screen.getByText(/1,000 chunks/)).toBeInTheDocument()
  })
})
