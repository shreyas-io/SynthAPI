import { apiRequest } from "../../../shared/api/client";
import type { ListResponse } from "../../projects/types";
import type { MockApi, MockApiInput } from "../types";

export const listMockApis = (
  projectId: string,
): Promise<ListResponse<MockApi>> => {
  return apiRequest(
    `/api/v1/mock-apis?project_id=${encodeURIComponent(projectId)}&limit=50&offset=0`,
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
