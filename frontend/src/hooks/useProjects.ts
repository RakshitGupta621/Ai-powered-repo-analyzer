"use client";

import { useState, useEffect, useCallback } from "react";
import { listProjects, createProject, deleteProject } from "@/lib/api";
import type { Project } from "@/types";
import toast from "react-hot-toast";

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listProjects();
      setProjects(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load projects";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const create = useCallback(
    async (name: string, repoUrl?: string): Promise<Project | null> => {
      try {
        const project = await createProject(name, repoUrl);
        setProjects((prev) => [project, ...prev]);
        toast.success("Project created successfully");
        return project;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create project";
        toast.error(message);
        return null;
      }
    },
    []
  );

  const remove = useCallback(async (id: string): Promise<void> => {
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      toast.success("Project deleted");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete project";
      toast.error(message);
      throw err;
    }
  }, []);

  return { projects, loading, error, refetch: fetch, create, remove };
};
