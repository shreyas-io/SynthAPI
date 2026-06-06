import { apiRequest } from "../../../lib/api/client";
import type { ListResponse, Project, ProjectInput } from "../types";

export const listProjects = (
  organizationId: string,
): Promise<ListResponse<Project>> => {
  return apiRequest(
    `/api/v1/projects?limit=50&offset=0&organization_id=${encodeURIComponent(organizationId)}`,
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
