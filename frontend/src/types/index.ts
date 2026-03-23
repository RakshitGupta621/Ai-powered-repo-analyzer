// ── Core domain types ──────────────────────────────────────────────────────────

export type ProjectStatus = "pending" | "ingesting" | "ready" | "failed";

export interface Project {
  id: string;
  name: string;
  repoUrl?: string;
  status: ProjectStatus;
  chunkCount: number;
  fileCount: number;
  fileTree: FileNode[];
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileNode {
  name: string;
  type: "file" | "dir";
  path?: string;
  children?: FileNode[];
}

export interface RetrievedChunk {
  chunk_id: string;
  file_path: string;
  content: string;
  score: number;
  language?: string;
  start_line?: number;
  end_line?: number;
}

export interface QueryResult {
  answer: string;
  retrieved_chunks: RetrievedChunk[];
  project_id: string;
  cached: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface IngestionJob {
  jobId: string;
  state: "waiting" | "active" | "completed" | "failed" | "delayed";
  progress: number;
  failedReason?: string;
}

// ── API response envelope ─────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: Array<{ msg: string; path: string }>;
}
