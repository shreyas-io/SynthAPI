import { apiRequest } from "../../../lib/api/client";
import type { AiCredits, Profile, ProfileOrganization } from "../types";

export const getProfile = (): Promise<Profile> => {
  return apiRequest("/api/v1/profile");
};

export const getOrganizationCredits = (
  organizationId: string,
): Promise<AiCredits> => {
  return apiRequest(`/api/v1/organizations/${organizationId}/credits`);
};

export const createOrganization = (name: string): Promise<ProfileOrganization> => {
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
