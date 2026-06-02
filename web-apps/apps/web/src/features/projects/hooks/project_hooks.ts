import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "../../../lib/query/query_keys";
import {
  createProject,
  getProject,
  listProjects,
  updateProject,
} from "../api/projects_api";
import type { ProjectInput } from "../types";

export const useProjects = () => {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: listProjects,
  });
};

export const useProject = (projectId: string | undefined) => {
  return useQuery({
    queryKey: projectId ? queryKeys.project(projectId) : ["projects", "missing"],
    queryFn: () => getProject(projectId!),
    enabled: Boolean(projectId),
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProject,
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
};

export const useUpdateProject = (projectId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProjectInput) => updateProject(projectId!, input),
    async onSuccess() {
      if (!projectId) return;

      await queryClient.invalidateQueries({
        queryKey: queryKeys.project(projectId),
      });
    },
  });
};
