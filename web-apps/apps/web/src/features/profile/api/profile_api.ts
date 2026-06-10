import { apiRequest } from "../../../lib/api/client";
import type {
  AiCredits,
  OrganizationInvite,
  OrganizationMember,
  Profile,
  ProfileOrganization,
} from "../types";

export const getProfile = (): Promise<Profile> => {
  return apiRequest("/api/v1/profile");
};

export const getOrganizationCredits = (
  organizationId: string,
): Promise<AiCredits> => {
  return apiRequest(`/api/v1/organizations/${organizationId}/credits`);
};

export const createOrganization = (
  name: string,
): Promise<ProfileOrganization> => {
  return apiRequest("/api/v1/organizations", {
    method: "POST",
    body: { name },
  });
};

export const deleteOrganization = (organizationId: string): Promise<void> => {
  return apiRequest(`/api/v1/organizations/${organizationId}`, {
    method: "DELETE",
  });
};

export const restoreOrganization = (organizationId: string): Promise<void> => {
  return apiRequest(`/api/v1/organizations/${organizationId}/restore`, {
    method: "POST",
  });
};

export const getOrganizationMembers = (
  organizationId: string,
): Promise<OrganizationMember[]> => {
  return apiRequest(`/api/v1/organizations/${organizationId}/members`);
};

export const getOrganizationInvites = (
  organizationId: string,
): Promise<OrganizationInvite[]> => {
  return apiRequest(`/api/v1/organizations/${organizationId}/invites`);
};

export const inviteOrganizationMember = (
  organizationId: string,
  email: string,
  role: "admin" | "member",
): Promise<void> => {
  return apiRequest(`/api/v1/organizations/${organizationId}/members`, {
    method: "POST",
    body: { email, role },
  });
};

export const removeOrganizationMember = (
  organizationId: string,
  userId: string,
): Promise<void> => {
  return apiRequest(
    `/api/v1/organizations/${organizationId}/members/${userId}`,
    {
      method: "DELETE",
    },
  );
};

export const leaveOrganization = (organizationId: string): Promise<void> => {
  return apiRequest(`/api/v1/organizations/${organizationId}/membership`, {
    method: "DELETE",
  });
};

export const revokeOrganizationInvite = (
  organizationId: string,
  inviteId: string,
): Promise<void> => {
  return apiRequest(
    `/api/v1/organizations/${organizationId}/invites/${inviteId}`,
    {
      method: "DELETE",
    },
  );
};

export const acceptOrganizationInvite = (inviteId: string): Promise<void> => {
  return apiRequest(`/api/v1/invites/${inviteId}/accept`, {
    method: "POST",
  });
};
