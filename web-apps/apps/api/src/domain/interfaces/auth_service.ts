import type { AuthenticatedUser } from "../entities/authenticated_user";
import type { AuthProviderName } from "../entities/auth_identity";

export type ProviderIdentity = {
  provider: AuthProviderName;
  provider_subject: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type AuthSessionResult = {
  token: string;
  expiresAt: string;
};

export interface IAuthService {
  signinWithProviderIdentity: (
    input: ProviderIdentity,
  ) => Promise<AuthSessionResult>;
  validateToken: (token: string) => Promise<AuthenticatedUser | null>;
}
