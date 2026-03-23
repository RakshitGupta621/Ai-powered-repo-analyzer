"use client";

import { useState } from "react";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import Modal from "@/components/ui/Modal";

interface Props {
  open: boolean;
  projectName: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function DeleteProjectModal({ open, projectName, onClose, onConfirm }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    setLoading(true);
    setError("");
    try {
      await onConfirm();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to delete project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Delete project"
      description="This action cannot be undone."
      icon={<AlertTriangle className="w-4 h-4" />}
      iconColor="red"
      maxWidth="sm"
    >
      <p className="text-text-secondary text-sm mb-5 leading-relaxed">
        Are you sure you want to delete{" "}
        <span className="font-semibold text-text-primary">"{projectName}"</span>?
        All indexed code, embeddings, and chat history will be permanently removed.
      </p>

      {error && (
        <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="flex-1 py-2.5 rounded-xl border border-border-base text-text-secondary hover:text-text-primary hover:border-border-bright text-sm transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading}
          aria-label={`Confirm delete ${projectName}`}
          className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          {loading ? "Deleting…" : "Delete project"}
        </button>
      </div>
    </Modal>
  );
}
