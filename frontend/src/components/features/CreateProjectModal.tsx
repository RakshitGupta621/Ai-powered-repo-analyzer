"use client";

import { useState } from "react";
import { FolderPlus, Loader2 } from "lucide-react";
import Modal from "@/components/ui/Modal";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, repoUrl?: string) => Promise<void>;
}

export default function CreateProjectModal({ open, onClose, onCreate }: Props) {
  const [name, setName]       = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onCreate(name.trim(), repoUrl.trim() || undefined);
      setName("");
      setRepoUrl("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New project"
      description="Give your codebase a name to get started."
      icon={<FolderPlus className="w-4 h-4" />}
      iconColor="cyan"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="project-name"
            className="block text-text-secondary text-sm mb-1.5"
          >
            Project name <span className="text-red-400" aria-label="required">*</span>
          </label>
          <input
            id="project-name"
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            placeholder="my-awesome-api"
            autoComplete="off"
            aria-required="true"
            aria-describedby={error ? "name-error" : undefined}
            className="w-full px-4 py-2.5 rounded-xl border border-border-base bg-bg-overlay text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-accent-cyan/50 focus:ring-1 focus:ring-accent-cyan/20 transition-colors"
          />
        </div>

        <div>
          <label
            htmlFor="repo-url"
            className="block text-text-secondary text-sm mb-1.5"
          >
            Repository URL{" "}
            <span className="text-text-muted text-xs">(optional)</span>
          </label>
          <input
            id="repo-url"
            type="url"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/user/repo"
            className="w-full px-4 py-2.5 rounded-xl border border-border-base bg-bg-overlay text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-accent-cyan/50 focus:ring-1 focus:ring-accent-cyan/20 transition-colors"
          />
        </div>

        {error && (
          <p id="name-error" role="alert" className="text-red-400 text-sm">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-border-base text-text-secondary hover:text-text-primary hover:border-border-bright text-sm transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="flex-1 py-2.5 rounded-xl bg-accent-cyan text-bg-base font-medium text-sm hover:bg-accent-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Creating…" : "Create project"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
