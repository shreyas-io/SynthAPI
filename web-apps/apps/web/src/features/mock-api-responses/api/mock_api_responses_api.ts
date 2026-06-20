import { apiRequest } from "../../../lib/api/client";
import type { ListResponse } from "../../projects/types";
import type { MockApiResponse, MockApiResponseInput } from "../types";

export const listMockApiResponses = (
  mockApiId: string,
  fetchDeleted?: boolean,
): Promise<
  ListResponse<
    Pick<
      MockApiResponse,
      "id" | "mock_api_id" | "name" | "is_default" | "deleted_at"
    >
  >
> => {
  const query = new URLSearchParams({
    limit: "50",
    offset: "0",
  });
  if (fetchDeleted) {
    query.set("fetch_deleted", "true");
  }
  return apiRequest(
    `/api/v1/mock-apis/${mockApiId}/responses?${query.toString()}`,
  );
};

export const getMockApiResponse = (
  mockApiId: string,
  responseId: string,
): Promise<MockApiResponse> => {
  return apiRequest(`/api/v1/mock-apis/${mockApiId}/responses/${responseId}`);
};

export const createMockApiResponse = (
  mockApiId: string,
  input: Omit<MockApiResponseInput, "mock_api_id">,
): Promise<MockApiResponse> => {
  return apiRequest(`/api/v1/mock-apis/${mockApiId}/responses`, {
    method: "POST",
    body: input,
  });
};

export const updateMockApiResponse = (
  mockApiId: string,
  responseId: string,
  input: Omit<MockApiResponseInput, "mock_api_id">,
): Promise<void> => {
  return apiRequest(`/api/v1/mock-apis/${mockApiId}/responses/${responseId}`, {
    method: "PUT",
    body: input,
  });
};

export const deleteMockApiResponse = (
  mockApiId: string,
  responseId: string,
): Promise<void> => {
  return apiRequest(`/api/v1/mock-apis/${mockApiId}/responses/${responseId}`, {
    method: "DELETE",
  });
};

export const restoreMockApiResponse = (
  mockApiId: string,
  responseId: string,
): Promise<void> => {
  return apiRequest(
    `/api/v1/mock-apis/${mockApiId}/responses/${responseId}/restore`,
    {
      method: "POST",
    },
  );
};

export const reorderMockApiResponses = (
  mockApiId: string,
  responseIds: string[],
): Promise<void> => {
  return apiRequest(`/api/v1/mock-apis/${mockApiId}/responses/reorder`, {
    method: "PATCH",
    body: { response_ids: responseIds },
  });
};
