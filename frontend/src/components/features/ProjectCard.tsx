"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Trash2, ChevronRight, FileCode, Layers } from "lucide-react";
import type { Project } from "@/types";
import ProjectStatus from "./ProjectStatus";
import DeleteProjectModal from "./DeleteProjectModal";

interface ProjectCardProps {
  project: Project;
  onDelete: () => Promise<void>;
}

export default function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const router = useRouter();
  const [showDelete, setShowDelete] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDelete(true);
  };

  return (
    <>
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 16 },
          visible: { opacity: 1, y: 0 },
        }}
        exit={{ opacity: 0, scale: 0.95 }}
        whileHover={{ y: -2 }}
        onClick={() => router.push(`/projects/${project.id}`)}
        role="button"
        tabIndex={0}
        aria-label={`Open project ${project.name}`}
        onKeyDown={(e) => e.key === "Enter" && router.push(`/projects/${project.id}`)}
        className="group relative p-5 rounded-2xl border border-border-subtle bg-bg-surface hover:border-border-base hover:bg-bg-raised cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-cyan/40"
      >
        {/* Top row */}
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-xl border border-border-base bg-bg-overlay flex items-center justify-center">
            <FileCode className="w-5 h-5 text-text-secondary" aria-hidden="true" />
          </div>

          <button
            onClick={handleDeleteClick}
            aria-label={`Delete project ${project.name}`}
            className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-text-muted transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-red-400/40"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        <h3 className="font-display font-semibold text-text-primary mb-1 truncate pr-4">
          {project.name}
        </h3>
        <ProjectStatus status={project.status} compact />

        {project.status === "ready" && (
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border-subtle">
            <div className="flex items-center gap-1.5 text-text-muted text-xs">
              <FileCode className="w-3 h-3" aria-hidden="true" />
              <span>{project.fileCount} files</span>
            </div>
            <div className="flex items-center gap-1.5 text-text-muted text-xs">
              <Layers className="w-3 h-3" aria-hidden="true" />
              <span>{project.chunkCount.toLocaleString()} chunks</span>
            </div>
          </div>
        )}

        {project.status === "failed" && project.errorMessage && (
          <p className="mt-3 text-xs text-red-400/80 line-clamp-2" role="alert">
            {project.errorMessage}
          </p>
        )}

        <ChevronRight
          className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
          aria-hidden="true"
        />
      </motion.div>

      <DeleteProjectModal
        open={showDelete}
        projectName={project.name}
        onClose={() => setShowDelete(false)}
        onConfirm={onDelete}
      />
    </>
  );
}
