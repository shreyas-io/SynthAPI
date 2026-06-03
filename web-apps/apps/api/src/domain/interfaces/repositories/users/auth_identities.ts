import type {
  AuthIdentity,
  AuthProviderName,
} from "../../../entities/auth_identity";

export type AuthIdentityInput = {
  provider: AuthProviderName;
  provider_subject: string;
  user_id: string;
};

export interface IAuthIdentitiesRepository {
  create: (input: AuthIdentityInput) => Promise<AuthIdentity>;
  findByProviderSubject: (input: {
    provider: AuthProviderName;
    provider_subject: string;
  }) => Promise<(AuthIdentity & { user: { id: string; username: string } }) | null>;
}
