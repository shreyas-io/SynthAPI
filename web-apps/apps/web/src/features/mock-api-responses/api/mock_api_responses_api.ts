import { apiRequest } from "../../../shared/api/client";
import type { ListResponse } from "../../projects/types";
import type { MockApiResponse, MockApiResponseInput } from "../types";

export const listMockApiResponses = (
  mockApiId: string,
): Promise<ListResponse<Pick<MockApiResponse, "id" | "mock_api_id" | "name" | "is_default">>> => {
  return apiRequest(
    `/api/v1/mock-apis/${mockApiId}/responses?limit=50&offset=0`,
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
