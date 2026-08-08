import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AtlasProject {
  id: string;
  name: string;
  path: string | null;
  updatedAt: string;
}

interface ProjectState {
  projects: AtlasProject[];
  activeProjectId: string | null;
  addProject: (project: Omit<AtlasProject, "id" | "updatedAt">) => AtlasProject;
  removeProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      projects: [],
      activeProjectId: null,
      addProject: (input) => {
        const project: AtlasProject = {
          ...input,
          id: crypto.randomUUID(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ projects: [project, ...state.projects], activeProjectId: project.id }));
        return project;
      },
      removeProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((project) => project.id !== id),
          activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
        })),
      setActiveProject: (activeProjectId) => set({ activeProjectId }),
    }),
    { name: "atlas-projects" },
  ),
);
