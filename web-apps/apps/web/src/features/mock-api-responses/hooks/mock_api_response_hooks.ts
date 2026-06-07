import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "../../../lib/query/query_keys";
import {
  createMockApiResponse,
  getMockApiResponse,
  listMockApiResponses,
  updateMockApiResponse,
} from "../api/mock_api_responses_api";
import type { MockApiResponseInput } from "../types";

type ResponseInput = Omit<MockApiResponseInput, "mock_api_id">;

export const useMockApiResponses = (mockApiId: string | undefined) => {
  return useQuery({
    queryKey: mockApiId
      ? queryKeys.mockApiResponses(mockApiId)
      : ["mock-apis", "missing", "responses"],
    queryFn: () => listMockApiResponses(mockApiId!),
    enabled: Boolean(mockApiId),
  });
};

export const useMockApiResponse = (
  mockApiId: string | undefined,
  responseId: string | undefined,
) => {
  return useQuery({
    queryKey:
      mockApiId && responseId
        ? queryKeys.mockApiResponse(mockApiId, responseId)
        : ["mock-apis", "missing", "responses", "missing"],
    queryFn: () => getMockApiResponse(mockApiId!, responseId!),
    enabled: Boolean(mockApiId && responseId),
  });
};

export const useCreateMockApiResponse = (mockApiId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ResponseInput) => createMockApiResponse(mockApiId!, input),
    async onSuccess() {
      if (!mockApiId) return;

      await queryClient.invalidateQueries({
        queryKey: queryKeys.mockApiResponses(mockApiId),
      });
    },
  });
};

export const useUpdateMockApiResponse = (
  mockApiId: string | undefined,
  responseId: string | undefined,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ResponseInput) =>
      updateMockApiResponse(mockApiId!, responseId!, input),
    async onSuccess() {
      if (!mockApiId || !responseId) return;

      await queryClient.invalidateQueries({
        queryKey: queryKeys.mockApiResponse(mockApiId, responseId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.mockApiResponses(mockApiId),
      });
    },
  });
};
