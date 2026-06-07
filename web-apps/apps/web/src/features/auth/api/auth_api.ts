import { apiRequest } from "../../../lib/api/client";
import type { AuthCredentials, AuthUser } from "../types";

const basicAuth = ({ username, password }: AuthCredentials): string => {
  return `Basic ${btoa(`${username}:${password}`)}`;
};

export const signup = (input: AuthCredentials): Promise<AuthUser> => {
  return apiRequest("/api/v1/auth/signup", {
    method: "POST",
    body: input,
  });
};

export const signin = (input: AuthCredentials): Promise<void> => {
  return apiRequest("/api/v1/auth/signin", {
    method: "POST",
    headers: {
      authorization: basicAuth(input),
    },
  });
};

export const signout = (): Promise<void> => {
  return apiRequest("/api/v1/auth/signout", {
    method: "POST",
  });
};

export const getCurrentUser = (): Promise<AuthUser> => {
  return apiRequest("/api/v1/auth/me");
};
