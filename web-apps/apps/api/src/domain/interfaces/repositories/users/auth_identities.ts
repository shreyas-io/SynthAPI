import type {
  AuthIdentity,
  AuthProviderName,
} from "../../../entities/auth_identity";

export type AuthIdentityInput = {
  provider: AuthProviderName;
  provider_subject: string;
  user_id: string;
};

type AuthIdentityFilters = {
  ids?: string[] | undefined;
  provider?: AuthProviderName | undefined;
  provider_subject?: string | undefined;
  user_ids?: string[] | undefined;
};

type ColumnKeys = Extract<keyof AuthIdentity, string>;

export interface IAuthIdentitiesRepository {
  create: (input: AuthIdentityInput) => Promise<AuthIdentity>;
  list: {
    (params: { filters: AuthIdentityFilters }): Promise<AuthIdentity[]>;
    <C extends readonly ColumnKeys[]>(params: {
      filters: AuthIdentityFilters;
      columns: C;
    }): Promise<Pick<AuthIdentity, C[number]>[]>;
  };
}
