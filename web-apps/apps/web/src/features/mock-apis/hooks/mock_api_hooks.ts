import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "../../../lib/query/query_keys";
import {
  createMockApi,
  getMockApi,
  listMockApis,
  updateMockApi,
} from "../api/mock_apis_api";
import type { MockApiInput } from "../types";

export const useMockApis = (projectId: string | undefined) => {
  return useQuery({
    queryKey: projectId ? queryKeys.mockApis(projectId) : ["projects", "missing", "mock-apis"],
    queryFn: () => listMockApis(projectId!),
    enabled: Boolean(projectId),
  });
};

export const useMockApi = (mockApiId: string | undefined) => {
  return useQuery({
    queryKey: mockApiId ? queryKeys.mockApi(mockApiId) : ["mock-apis", "missing"],
    queryFn: () => getMockApi(mockApiId!),
    enabled: Boolean(mockApiId),
  });
};

export const useCreateMockApi = (projectId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMockApi,
    async onSuccess() {
      if (!projectId) return;

      await queryClient.invalidateQueries({
        queryKey: queryKeys.mockApis(projectId),
      });
    },
  });
};

export const useUpdateMockApi = (mockApiId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: MockApiInput) => updateMockApi(mockApiId!, input),
    async onSuccess() {
      if (!mockApiId) return;

      await queryClient.invalidateQueries({
        queryKey: queryKeys.mockApi(mockApiId),
      });
    },
  });
};
