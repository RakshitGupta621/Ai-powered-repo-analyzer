"use client";

import { useState, useEffect, useCallback } from "react";
import { listProjects, createProject, deleteProject } from "@/lib/api";
import type { Project } from "@/types";
import toast from "react-hot-toast";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listProjects();
      setProjects(data);
    } catch (err: any) {
      setError(err.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (name: string, repoUrl?: string): Promise<Project | null> => {
    try {
      const project = await createProject(name, repoUrl);
      setProjects((prev) => [project, ...prev]);
      toast.success("Project created successfully");
      return project;
    } catch (err: any) {
      toast.error(err.message || "Failed to create project");
      return null;
    }
  };

  // Returns a promise so the delete modal can await it and show errors inline
  const remove = async (id: string): Promise<void> => {
    await deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    toast.success("Project deleted");
  };

  return { projects, loading, error, refetch: fetch, create, remove };
}
