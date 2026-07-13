import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "../../../lib/query/query_keys";
import {
  createOrganization,
  deleteOrganization,
  getOrganizationCredits,
  getOrganizationPlan,
  getOrganizationInvites,
  getOrganizationMembers,
  getProfile,
  inviteOrganizationMember,
  leaveOrganization,
  removeOrganizationMember,
  restoreOrganization,
  revokeOrganizationInvite,
  updateOrganizationMemberStatus,
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

export const useOrganizationPlan = (organizationId: string) => {
  return useQuery({
    queryKey: queryKeys.organizationPlan(organizationId),
    queryFn: () => getOrganizationPlan(organizationId),
  });
};

export const useOrganizationMembers = (
  organizationId: string,
  enabled = true,
) => {
  return useQuery({
    queryKey: queryKeys.organizationMembers(organizationId),
    queryFn: () => getOrganizationMembers(organizationId),
    enabled,
  });
};

export const useOrganizationInvites = (
  organizationId: string,
  enabled = true,
) => {
  return useQuery({
    queryKey: queryKeys.organizationInvites(organizationId),
    queryFn: () => getOrganizationInvites(organizationId),
    enabled,
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

export const useLeaveOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: leaveOrganization,
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });
};

export const useInviteOrganizationMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organizationId,
      email,
      role,
    }: {
      organizationId: string;
      email: string;
      role: "admin" | "member";
    }) => inviteOrganizationMember(organizationId, email, role),
    async onSuccess(_, variables) {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.organizationInvites(variables.organizationId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.profile }),
      ]);
    },
  });
};

export const useRevokeOrganizationInvite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organizationId,
      inviteId,
    }: {
      organizationId: string;
      inviteId: string;
    }) => revokeOrganizationInvite(organizationId, inviteId),
    async onSuccess(_, variables) {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.organizationInvites(variables.organizationId),
      });
    },
  });
};

export const useUpdateOrganizationMemberStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organizationId,
      userId,
      status,
    }: {
      organizationId: string;
      userId: string;
      status: "active" | "stale";
    }) => updateOrganizationMemberStatus(organizationId, userId, status),
    async onSuccess(_, variables) {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.organizationMembers(variables.organizationId),
      });
    },
  });
};
