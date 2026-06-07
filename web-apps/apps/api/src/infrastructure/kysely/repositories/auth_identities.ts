import type { Selectable } from "kysely";

import type { AuthIdentity } from "../../../domain/entities/auth_identity.js";
import type {
  AuthIdentityInput,
  IAuthIdentitiesRepository,
} from "../../../domain/interfaces/repositories/users/auth_identities.js";
import type { ServerContext } from "../../../server.js";
import type { AuthIdentitiesTable } from "../models/index.js";

type AuthIdentityRow = Selectable<AuthIdentitiesTable>;

const toAuthIdentity = (row: AuthIdentityRow): AuthIdentity => ({
  id: row.id,
  provider: row.provider as AuthIdentity["provider"],
  provider_subject: row.provider_subject,
  user_id: row.user_id,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

type AuthIdentityFilters = {
  ids?: string[] | undefined;
  provider?: AuthIdentity["provider"] | undefined;
  provider_subject?: string | undefined;
  user_ids?: string[] | undefined;
};

type ColumnKeys = Extract<keyof AuthIdentity, string>;

const list = (ctx: ServerContext): IAuthIdentitiesRepository["list"] => {
  async function listAuthIdentities(params: {
    filters: AuthIdentityFilters;
  }): Promise<AuthIdentity[]>;
  async function listAuthIdentities<C extends readonly ColumnKeys[]>(params: {
    filters: AuthIdentityFilters;
    columns: C;
  }): Promise<Pick<AuthIdentity, C[number]>[]>;
  async function listAuthIdentities<C extends readonly ColumnKeys[]>({
    filters,
    columns,
  }: {
    filters: AuthIdentityFilters;
    columns?: C;
  }): Promise<AuthIdentity[] | Pick<AuthIdentity, C[number]>[]> {
    if (
      !filters.ids?.length &&
      !filters.provider &&
      !filters.provider_subject &&
      !filters.user_ids?.length
    ) {
      return [];
    }

    let query = ctx.db.selectFrom("auth_identities");

    if (columns?.length) {
      query = query.select(columns);
    } else {
      query = query.selectAll();
    }

    if (filters.ids?.length) {
      query = query.where("id", "in", filters.ids);
    }

    if (filters.provider) {
      query = query.where("provider", "=", filters.provider);
    }

    if (filters.provider_subject) {
      query = query.where("provider_subject", "=", filters.provider_subject);
    }

    if (filters.user_ids?.length) {
      query = query.where("user_id", "in", filters.user_ids);
    }

    const rows = await query.execute();

    return rows as AuthIdentity[] | Pick<AuthIdentity, C[number]>[];
  }

  return listAuthIdentities;
};

export const AuthIdentitiesRepository = (
  ctx: ServerContext,
): IAuthIdentitiesRepository => ({
  async create(input: AuthIdentityInput): Promise<AuthIdentity> {
    const row = await ctx.db
      .insertInto("auth_identities")
      .values({
        provider: input.provider,
        provider_subject: input.provider_subject,
        user_id: input.user_id,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return toAuthIdentity(row);
  },
  list: list(ctx),
});
