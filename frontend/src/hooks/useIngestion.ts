"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ingestZip, getJobStatus, queryProject } from "@/lib/api";
import type { IngestionJob, QueryResult } from "@/types";
import toast from "react-hot-toast";

const POLL_INTERVAL = 2000;
const MAX_RETRIES = 3;

export const useIngestion = (projectId: string, onComplete?: () => void) => {
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [jobState, setJobState] = useState<IngestionJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryCountRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    retryCountRef.current = 0;
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const pollJob = useCallback(
    (jobId: string) => {
      setProcessing(true);
      pollRef.current = setInterval(async () => {
        try {
          const status = await getJobStatus(jobId);
          setJobState(status);
          setProgress(status.progress ?? 0);
          retryCountRef.current = 0;

          if (status.state === "completed") {
            stopPolling();
            setProcessing(false);
            toast.success("Codebase ingested successfully!");
            onComplete?.();
          } else if (status.state === "failed") {
            stopPolling();
            setProcessing(false);
            const msg = status.failedReason ?? "Ingestion failed";
            setError(msg);
            toast.error(msg);
          }
        } catch (err) {
          retryCountRef.current++;
          if (retryCountRef.current >= MAX_RETRIES) {
            stopPolling();
            setProcessing(false);
            const msg = "Failed to check ingestion status";
            setError(msg);
            toast.error(msg);
          }
        }
      }, POLL_INTERVAL);
    },
    [onComplete, stopPolling]
  );

  const startIngestion = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);
      setUploadPct(0);

      try {
        const { jobId } = await ingestZip(projectId, file, setUploadPct);
        setUploading(false);
        pollJob(jobId);
      } catch (err) {
        setUploading(false);
        const msg = err instanceof Error ? err.message : "Upload failed";
        setError(msg);
        toast.error(msg);
      }
    },
    [projectId, pollJob]
  );

  return {
    startIngestion,
    uploading,
    uploadPct,
    processing,
    progress,
    jobState,
    error,
    stopPolling,
  };
};

// ── useQuery ──────────────────────────────────────────────────────────────────

export const useQuery = (projectId: string) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ question: string; result: QueryResult }>>([]);

  const ask = useCallback(
    async (question: string) => {
      setLoading(true);
      setError(null);

      try {
        const data = await queryProject(projectId, question);
        setResult(data);
        setHistory((prev) => [{ question, result: data }, ...prev]);
        return data;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Query failed";
        setError(msg);
        toast.error(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [projectId]
  );

  return { ask, loading, result, error, history };
};
