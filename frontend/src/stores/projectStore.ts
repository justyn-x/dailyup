import { create } from "zustand";
import { request } from "@/services/api";
import type { Project, ProjectDetail, CreateProjectRequest } from "@/types";

interface ProjectStore {
  projects: Project[];
  currentProject: ProjectDetail | null;
  loading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  fetchProject: (id: number) => Promise<void>;
  createProject: (data: CreateProjectRequest) => Promise<Project>;
  deleteProject: (id: number) => Promise<void>;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  currentProject: null,
  loading: false,
  error: null,

  fetchProjects: async () => {
    set({ loading: true, error: null });
    try {
      const projects = await request<Project[]>("/projects");
      set({ projects, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "获取项目列表失败",
        loading: false,
      });
    }
  },

  fetchProject: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const project = await request<ProjectDetail>(`/projects/${id}`);
      set({ currentProject: project, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "获取项目详情失败",
        loading: false,
      });
    }
  },

  createProject: async (data: CreateProjectRequest) => {
    set({ loading: true, error: null });
    try {
      const project = await request<Project>("/projects", {
        method: "POST",
        body: JSON.stringify(data),
      });
      set((state) => ({
        projects: [...state.projects, project],
        loading: false,
      }));
      return project;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "创建项目失败",
        loading: false,
      });
      throw err;
    }
  },

  deleteProject: async (id: number) => {
    set({ loading: true, error: null });
    try {
      await request<void>(`/projects/${id}`, { method: "DELETE" });
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        currentProject:
          state.currentProject?.id === id ? null : state.currentProject,
        loading: false,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "删除项目失败",
        loading: false,
      });
      throw err;
    }
  },
}));
