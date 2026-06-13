import { apiRequest } from "../../../lib/api/client";
import type { ListResponse } from "../../projects/types";
import type { MockApi, MockApiInput } from "../types";

export const listMockApis = (
  projectId: string,
  fetchDeleted?: boolean,
): Promise<ListResponse<MockApi>> => {
  const query = new URLSearchParams({
    project_id: projectId,
    limit: "50",
    offset: "0",
  });
  if (fetchDeleted) {
    query.set("fetch_deleted", "true");
  }
  return apiRequest(
    `/api/v1/mock-apis?${query.toString()}`,
  );
};

export const createMockApi = (input: MockApiInput): Promise<MockApi> => {
  return apiRequest("/api/v1/mock-apis", {
    method: "POST",
    body: input,
  });
};

export const getMockApi = (id: string): Promise<MockApi> => {
  return apiRequest(`/api/v1/mock-apis/${id}`);
};

export const updateMockApi = (
  id: string,
  input: MockApiInput,
): Promise<void> => {
  return apiRequest(`/api/v1/mock-apis/${id}`, {
    method: "PUT",
    body: input,
  });
};

export const deleteMockApi = (id: string): Promise<void> => {
  return apiRequest(`/api/v1/mock-apis/${id}`, {
    method: "DELETE",
  });
};

export const restoreMockApi = (id: string): Promise<void> => {
  return apiRequest(`/api/v1/mock-apis/${id}/restore`, {
    method: "POST",
  });
};
