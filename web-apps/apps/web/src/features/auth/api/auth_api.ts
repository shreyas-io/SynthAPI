import { apiBaseUrl } from "../../../env";
import { apiRequest } from "../../../lib/api/client";
import type { AuthProviders, AuthUser } from "../types";

export const getAuthProviders = (): Promise<AuthProviders> => {
  return apiRequest("/api/v1/auth/providers");
};

export const signout = (): Promise<void> => {
  return apiRequest("/api/v1/auth/signout", {
    method: "POST",
  });
};

export const getCurrentUser = (): Promise<AuthUser> => {
  return apiRequest("/api/v1/auth/me");
};

export const getGoogleAuthStartUrl = (returnTo = "/projects"): string => {
  const params = new URLSearchParams({
    return_to: returnTo,
  });

  return `${apiBaseUrl}/api/v1/auth/google/start?${params.toString()}`;
};
