"use client";

import { useState, useRef, useCallback } from "react";
import { ingestZip, getJobStatus, queryProject } from "@/lib/api";
import type { IngestionJob, QueryResult } from "@/types";
import toast from "react-hot-toast";

// ── useIngestion ──────────────────────────────────────────────────────────────

export function useIngestion(projectId: string, onComplete?: () => void) {
  const [uploading, setUploading]     = useState(false);
  const [uploadPct, setUploadPct]     = useState(0);
  const [processing, setProcessing]   = useState(false);
  const [progress, setProgress]       = useState(0);
  const [jobState, setJobState]       = useState<IngestionJob | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const pollRef                       = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const pollJob = useCallback((jobId: string) => {
    setProcessing(true);
    pollRef.current = setInterval(async () => {
      try {
        const status = await getJobStatus(jobId);
        setJobState(status);
        setProgress(status.progress ?? 0);

        if (status.state === "completed") {
          stopPolling();
          setProcessing(false);
          toast.success("Codebase ingested successfully!");
          onComplete?.();
        } else if (status.state === "failed") {
          stopPolling();
          setProcessing(false);
          const msg = status.failedReason || "Ingestion failed";
          setError(msg);
          toast.error(msg);
        }
      } catch {
        // Poll errors are transient — keep polling
      }
    }, 2000);
  }, [onComplete]);

  const startIngestion = async (file: File) => {
    setError(null);
    setUploading(true);
    setUploadPct(0);

    try {
      const { jobId } = await ingestZip(projectId, file, setUploadPct);
      setUploading(false);
      pollJob(jobId);
    } catch (err: any) {
      setUploading(false);
      const msg = err.message || "Upload failed";
      setError(msg);
      toast.error(msg);
    }
  };

  return {
    startIngestion,
    uploading, uploadPct,
    processing, progress,
    jobState, error,
  };
}

// ── useQuery ──────────────────────────────────────────────────────────────────

export function useQuery(projectId: string) {
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<QueryResult | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [history, setHistory]   = useState<Array<{ question: string; result: QueryResult }>>([]);

  const ask = async (question: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await queryProject(projectId, question);
      setResult(data);
      setHistory((prev) => [{ question, result: data }, ...prev]);
      return data;
    } catch (err: any) {
      const msg = err.message || "Query failed";
      setError(msg);
      toast.error(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { ask, loading, result, error, history };
}
