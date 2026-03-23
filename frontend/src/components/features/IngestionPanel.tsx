"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import { Upload, FileArchive, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import type { Project } from "@/types";
import { useIngestion } from "@/hooks/useIngestion";

interface Props {
  project: Project;
  onComplete: () => void;
}

export default function IngestionPanel({ project, onComplete }: Props) {
  const {
    startIngestion,
    uploading, uploadPct,
    processing, progress,
    jobState, error,
  } = useIngestion(project.id, onComplete);

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) startIngestion(accepted[0]);
    },
    [startIngestion]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/zip": [".zip"] },
    maxFiles: 1,
    disabled: uploading || processing,
  });

  const isBusy = uploading || processing;

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h2 className="font-display font-semibold text-text-primary mb-1">
          Upload Codebase
        </h2>
        <p className="text-text-muted text-sm">
          ZIP your project folder and upload it to index the codebase.
        </p>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          relative rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-200
          ${isBusy ? "opacity-60 cursor-not-allowed" : ""}
          ${isDragActive
            ? "border-accent-cyan bg-accent-cyan/5"
            : "border-border-base hover:border-border-bright hover:bg-bg-surface"
          }
        `}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-3">
          {isBusy ? (
            <Loader2 className="w-10 h-10 text-accent-cyan animate-spin" />
          ) : isDragActive ? (
            <FileArchive className="w-10 h-10 text-accent-cyan" />
          ) : (
            <Upload className="w-10 h-10 text-text-muted" />
          )}

          <div>
            {isBusy ? (
              <p className="text-text-secondary text-sm">Processing…</p>
            ) : isDragActive ? (
              <p className="text-accent-cyan text-sm font-medium">Drop it!</p>
            ) : (
              <>
                <p className="text-text-secondary text-sm">
                  Drag & drop a <span className="text-text-primary font-medium">.zip</span> file here
                </p>
                <p className="text-text-muted text-xs mt-1">or click to browse · max 50 MB</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Progress */}
      {isBusy && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 rounded-xl border border-border-subtle bg-bg-surface"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-secondary text-sm">
              {uploading ? "Uploading…" : getProcessingLabel(progress)}
            </span>
            <span className="font-mono text-accent-cyan text-sm">
              {uploading ? `${uploadPct}%` : `${progress}%`}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-bg-overlay overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-accent-cyan to-accent-green rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${uploading ? uploadPct : progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 flex items-start gap-3 p-4 rounded-xl border border-red-400/20 bg-red-400/5"
        >
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{error}</p>
        </motion.div>
      )}

      {/* Tips */}
      {!isBusy && !error && (
        <div className="mt-6 space-y-2">
          <p className="text-text-muted text-xs font-medium uppercase tracking-wider">Tips</p>
          {[
            "Exclude node_modules and build dirs before zipping",
            "Supports JS, TS, Python, Go, Rust, Java, and more",
            "Large repos (500+ files) may take a few minutes",
          ].map((tip) => (
            <p key={tip} className="text-text-muted text-xs flex items-start gap-2">
              <span className="text-accent-cyan/60 mt-0.5">›</span>
              {tip}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function getProcessingLabel(progress: number): string {
  if (progress < 20) return "Parsing files…";
  if (progress < 40) return "Chunking code…";
  if (progress < 90) return "Generating embeddings…";
  return "Storing vectors…";
}
