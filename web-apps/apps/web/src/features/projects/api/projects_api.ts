import { apiRequest } from "../../../lib/api/client";
import type { ListResponse, Project, ProjectInput } from "../types";

export type ListProjectsParams = {
  limit: number;
  offset: number;
  search?: string;
  fetch_deleted?: boolean;
};

export const listProjects = (
  organizationId: string,
  params: ListProjectsParams,
): Promise<ListResponse<Project>> => {
  const query = new URLSearchParams({
    limit: String(params.limit),
    offset: String(params.offset),
    organization_id: organizationId,
  });

  if (params.search) {
    query.set("search", params.search);
  }

  if (params.fetch_deleted) {
    query.set("fetch_deleted", "true");
  }

  return apiRequest(
    `/api/v1/projects?${query.toString()}`,
  );
};

export const createProject = (input: ProjectInput): Promise<Project> => {
  return apiRequest("/api/v1/projects", {
    method: "POST",
    body: input,
  });
};

export const getProject = (id: string): Promise<Project> => {
  return apiRequest(`/api/v1/projects/${id}`);
};

export const updateProject = (
  id: string,
  input: ProjectInput,
): Promise<void> => {
  return apiRequest(`/api/v1/projects/${id}`, {
    method: "PUT",
    body: input,
  });
};

export const deleteProject = (id: string): Promise<void> => {
  return apiRequest(`/api/v1/projects/${id}`, {
    method: "DELETE",
  });
};

export const restoreProject = (id: string): Promise<void> => {
  return apiRequest(`/api/v1/projects/${id}/restore`, {
    method: "POST",
  });
};
