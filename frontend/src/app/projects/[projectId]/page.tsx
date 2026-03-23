"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { getProject } from "@/lib/api";
import { useQuery } from "@/hooks/useIngestion";
import type { Project } from "@/types";
import AppShell from "@/components/layout/AppShell";
import ProjectStatus from "@/components/features/ProjectStatus";
import IngestionPanel from "@/components/features/IngestionPanel";
import QueryPanel from "@/components/features/QueryPanel";
import FileTree from "@/components/features/FileTree";

type Tab = "query" | "files";

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();

  const [project, setProject]     = useState<Project | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [tab, setTab]             = useState<Tab>("query");

  const fetchProject = async () => {
    try {
      const data = await getProject(projectId);
      setProject(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  // Poll project status while ingesting
  useEffect(() => {
    if (project?.status !== "ingesting" && project?.status !== "pending") return;
    const timer = setInterval(fetchProject, 3000);
    return () => clearInterval(timer);
  }, [project?.status]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-6 h-6 animate-spin text-accent-cyan" />
        </div>
      </AppShell>
    );
  }

  if (error || !project) {
    return (
      <AppShell>
        <div className="flex flex-col items-center gap-4 py-32">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-text-secondary">{error || "Project not found"}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-accent-cyan text-sm hover:underline"
          >
            Back to dashboard
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Back nav */}
      <button
        onClick={() => router.push("/dashboard")}
        className="flex items-center gap-2 text-text-muted hover:text-text-primary text-sm mb-8 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        All Projects
      </button>

      {/* Project header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-text-primary">
            {project.name}
          </h1>
          {project.repoUrl && (
            <a
              href={project.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-muted text-sm hover:text-accent-cyan transition-colors mt-1 inline-block"
            >
              {project.repoUrl}
            </a>
          )}
        </div>
        <ProjectStatus status={project.status} />
      </div>

      {/* Stats row */}
      {project.status === "ready" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-6 mb-8"
        >
          {[
            { label: "Files indexed", value: project.fileCount },
            { label: "Code chunks", value: project.chunkCount.toLocaleString() },
          ].map(({ label, value }) => (
            <div key={label} className="px-4 py-3 rounded-xl border border-border-subtle bg-bg-surface">
              <p className="text-text-muted text-xs mb-1">{label}</p>
              <p className="font-mono text-accent-cyan text-lg font-medium">{value}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Ingestion panel (shown when not ready) */}
      {project.status !== "ready" && (
        <IngestionPanel
          project={project}
          onComplete={fetchProject}
        />
      )}

      {/* Tabs (only when ready) */}
      {project.status === "ready" && (
        <>
          <div className="flex gap-1 p-1 rounded-xl border border-border-subtle bg-bg-surface w-fit mb-8">
            {(["query", "files"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                  tab === t
                    ? "bg-accent-cyan text-bg-base"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "query" && <QueryPanel projectId={projectId} />}
          {tab === "files" && <FileTree fileTree={project.fileTree} />}
        </>
      )}
    </AppShell>
  );
}
