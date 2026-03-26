/**
 * Typed API client with automatic error normalization.
 * All calls go through this module — no fetch/axios calls in components.
 */

import axios, { type AxiosError } from "axios";
import type { Project, QueryResult, ChatMessage, IngestionJob, ApiResponse } from "@/types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api",
  timeout: 120_000,
  headers: { "Content-Type": "application/json" },
});

// Normalize errors to consistent shape with proper types
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<ApiResponse<null>>) => {
    const message = err.response?.data?.message ?? err.message ?? "Network error";
    const status = err.response?.status ?? 0;
    const apiErr = new Error(message) as Error & { status: number };
    apiErr.status = status;
    return Promise.reject(apiErr);
  }
);

// ── Projects ──────────────────────────────────────────────────────────────────

export const createProject = async (name: string, repoUrl?: string): Promise<Project> => {
  const { data } = await api.post<ApiResponse<Project>>("/projects", { name, repoUrl });
  return data.data;
};

export const listProjects = async (): Promise<Project[]> => {
  const { data } = await api.get<ApiResponse<Project[]>>("/projects");
  return data.data;
};

export const getProject = async (projectId: string): Promise<Project> => {
  const { data } = await api.get<ApiResponse<Project>>(`/projects/${projectId}`);
  return data.data;
};

export const deleteProject = async (projectId: string): Promise<void> => {
  await api.delete(`/projects/${projectId}`);
};

// ── Ingestion ─────────────────────────────────────────────────────────────────

export const ingestZip = async (
  projectId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<{ jobId: string }> => {
  const form = new FormData();
  form.append("projectId", projectId);
  form.append("file", file);

  const { data } = await api.post<ApiResponse<{ jobId: string }>>("/ingest", form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    },
  });
  return data.data;
};

export const getJobStatus = async (jobId: string): Promise<IngestionJob> => {
  const { data } = await api.get<ApiResponse<IngestionJob>>(`/ingest/${jobId}/status`);
  return data.data;
};

// ── Query ─────────────────────────────────────────────────────────────────────

export const queryProject = async (
  projectId: string,
  question: string,
  topK?: number
): Promise<QueryResult> => {
  const { data } = await api.post<ApiResponse<QueryResult>>("/query", {
    projectId,
    question,
    topK: topK ?? null,
  });
  return data.data;
};

// ── Chat ──────────────────────────────────────────────────────────────────────

export const getChatHistory = async (projectId: string): Promise<ChatMessage[]> => {
  const { data } = await api.get<ApiResponse<{ messages: ChatMessage[] }>>(`/chat/${projectId}`);
  return data.data.messages;
};

export const clearChatHistory = async (projectId: string): Promise<void> => {
  await api.delete(`/chat/${projectId}`);
};

// ── Files ─────────────────────────────────────────────────────────────────────

export const getFileTree = async (projectId: string) => {
  const { data } = await api.get(`/files/${projectId}`);
  return data.data;
};
