import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "../../../lib/query/query_keys";
import {
  createProjectApiKey,
  createProject,
  deleteProject,
  getProject,
  listProjectApiKeys,
  revokeProjectApiKey,
  listProjects,
  restoreProject,
  updateProject,
  type ListProjectsParams,
} from "../api/projects_api";
import type { ProjectInput } from "../types";

export const useProjects = (
  organizationId: string,
  params: ListProjectsParams,
) => {
  return useQuery({
    queryKey: queryKeys.projects(organizationId, params),
    queryFn: () => listProjects(organizationId, params),
    enabled: Boolean(organizationId),
  });
};

export const useDeletedProjects = (
  organizationId: string,
  params: Omit<ListProjectsParams, "fetch_deleted">,
) => {
  return useQuery({
    queryKey: queryKeys.projects(organizationId, { ...params, fetch_deleted: true }),
    queryFn: () => listProjects(organizationId, { ...params, fetch_deleted: true }),
    enabled: Boolean(organizationId),
  });
};

export const useProject = (projectId: string | undefined) => {
  return useQuery({
    queryKey: projectId ? queryKeys.project(projectId) : ["projects", "missing"],
    queryFn: () => getProject(projectId!),
    enabled: Boolean(projectId),
  });
};

export const useProjectApiKeys = (projectId: string | undefined) => {
  return useQuery({
    queryKey: projectId
      ? queryKeys.projectApiKeys(projectId)
      : ["projects", "missing", "api-keys"],
    queryFn: () => listProjectApiKeys(projectId!),
    enabled: Boolean(projectId),
  });
};

export const useCreateProject = (organizationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProject,
    async onSuccess() {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.projectListRoot(organizationId),
      });
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

export const useCreateProjectApiKey = (projectId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { name: string }) =>
      createProjectApiKey(projectId!, input),
    async onSuccess() {
      if (!projectId) return;

      await queryClient.invalidateQueries({
        queryKey: queryKeys.projectApiKeys(projectId),
      });
    },
  });
};

export const useRevokeProjectApiKey = (projectId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (keyId: string) => revokeProjectApiKey(projectId!, keyId),
    async onSuccess() {
      if (!projectId) return;

      await queryClient.invalidateQueries({
        queryKey: queryKeys.projectApiKeys(projectId),
      });
    },
  });
};

export const useDeleteProject = (organizationId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProject,
    async onSuccess() {
      if (!organizationId) return;

      await queryClient.invalidateQueries({
        queryKey: queryKeys.projectListRoot(organizationId),
      });
    },
  });
};

export const useRestoreProject = (organizationId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: restoreProject,
    async onSuccess() {
      if (!organizationId) return;

      await queryClient.invalidateQueries({
        queryKey: queryKeys.projectListRoot(organizationId),
      });
    },
  });
};
