import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "../../../lib/query/query_keys";
import {
  createOrganization,
  deleteOrganization,
  getOrganizationCredits,
  getProfile,
  restoreOrganization,
} from "../api/profile_api";

export const useProfile = () => {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: getProfile,
  });
};

export const useOrganizationCredits = (organizationId: string) => {
  return useQuery({
    queryKey: queryKeys.organizationCredits(organizationId),
    queryFn: () => getOrganizationCredits(organizationId),
  });
};

export const useCreateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOrganization,
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });
};

export const useDeleteOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteOrganization,
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });
};

export const useRestoreOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: restoreOrganization,
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });
};
