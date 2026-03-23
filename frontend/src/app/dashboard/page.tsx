"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, FolderOpen, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import ProjectCard from "@/components/features/ProjectCard";
import CreateProjectModal from "@/components/features/CreateProjectModal";
import AppShell from "@/components/layout/AppShell";

export default function DashboardPage() {
  const { projects, loading, error, refetch, create, remove } = useProjects();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <AppShell>
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="font-display text-3xl font-bold text-text-primary">
            Your projects
          </h1>
          <p className="text-text-muted text-sm mt-1">
            {projects.length === 0
              ? "No projects yet"
              : `${projects.length} codebase${projects.length !== 1 ? "s" : ""} indexed`}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          aria-label="Create new project"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-cyan text-bg-base font-medium text-sm hover:bg-accent-cyan/90 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-cyan/40"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          New project
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24" role="status" aria-label="Loading projects">
          <Loader2 className="w-6 h-6 animate-spin text-accent-cyan" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex flex-col items-center gap-4 py-24" role="alert">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
          <button
            onClick={refetch}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border-base text-text-secondary text-sm hover:border-border-bright hover:text-text-primary transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && projects.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 py-24 text-center"
        >
          <div className="w-16 h-16 rounded-2xl border border-border-base bg-bg-surface flex items-center justify-center">
            <FolderOpen className="w-7 h-7 text-text-muted" aria-hidden="true" />
          </div>
          <div>
            <p className="text-text-secondary font-medium">No projects yet</p>
            <p className="text-text-muted text-sm mt-1 max-w-xs">
              Create a project and upload a ZIP of your codebase to start querying it with AI.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-2 px-5 py-2.5 rounded-xl bg-accent-cyan text-bg-base font-medium text-sm hover:bg-accent-cyan/90 transition-colors"
          >
            Create your first project
          </button>
        </motion.div>
      )}

      {/* Project grid */}
      {!loading && !error && projects.length > 0 && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          <AnimatePresence>
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={() => remove(project.id)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Create modal */}
      <CreateProjectModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={async (name, repoUrl) => {
          await create(name, repoUrl);
          setShowCreate(false);
        }}
      />
    </AppShell>
  );
}
