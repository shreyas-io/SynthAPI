import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "../../../lib/query/query_keys";
import {
  createMockApiResponse,
  deleteMockApiResponse,
  getMockApiResponse,
  listMockApiResponses,
  reorderMockApiResponses,
  restoreMockApiResponse,
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

export const useDeletedMockApiResponses = (mockApiId: string | undefined) => {
  return useQuery({
    queryKey: mockApiId
      ? ["mock-apis", mockApiId, "responses", { deleted: true }]
      : ["mock-apis", "missing", "responses", { deleted: true }],
    queryFn: () => listMockApiResponses(mockApiId!, true),
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

export const useDeleteMockApiResponse = (
  mockApiId: string | undefined,
  responseId: string | undefined,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteMockApiResponse(mockApiId!, responseId!),
    async onSuccess() {
      if (!mockApiId || !responseId) return;

      await queryClient.invalidateQueries({
        queryKey: queryKeys.mockApiResponses(mockApiId),
      });
      queryClient.removeQueries({
        queryKey: queryKeys.mockApiResponse(mockApiId, responseId),
      });
    },
  });
};

export const useRestoreMockApiResponse = (mockApiId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (responseId: string) => restoreMockApiResponse(mockApiId!, responseId),
    async onSuccess(_data, responseId) {
      if (!mockApiId) return;

      await queryClient.invalidateQueries({
        queryKey: queryKeys.mockApiResponses(mockApiId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.mockApiResponse(mockApiId, responseId),
      });
    },
  });
};

export const useReorderMockApiResponses = (mockApiId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (responseIds: string[]) =>
      reorderMockApiResponses(mockApiId!, responseIds),
    async onMutate(responseIds) {
      if (!mockApiId) return;

      await queryClient.cancelQueries({
        queryKey: queryKeys.mockApiResponses(mockApiId),
      });

      const previousResponses = queryClient.getQueryData<any>(
        queryKeys.mockApiResponses(mockApiId),
      );

      if (previousResponses?.records) {
        const newRecords = [...previousResponses.records].sort((a, b) => {
          return responseIds.indexOf(a.id) - responseIds.indexOf(b.id);
        });
        queryClient.setQueryData(queryKeys.mockApiResponses(mockApiId), {
          ...previousResponses,
          records: newRecords,
        });
      }

      return { previousResponses };
    },
    onError(err, newOrder, context) {
      if (context?.previousResponses && mockApiId) {
        queryClient.setQueryData(
          queryKeys.mockApiResponses(mockApiId),
          context.previousResponses,
        );
      }
    },
    onSettled() {
      if (!mockApiId) return;
      void queryClient.invalidateQueries({
        queryKey: queryKeys.mockApiResponses(mockApiId),
      });
    },
  });
};
