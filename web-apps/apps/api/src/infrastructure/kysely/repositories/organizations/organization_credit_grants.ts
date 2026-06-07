import type {
  OrganizationCreditGrant,
  OrganizationCreditGrantType,
} from "../../../../domain/entities/organization.js";
import type { IOrganizationCreditGrantsRepository } from "../../../../domain/interfaces/repositories/organizations/organization_credit_grants.js";
import type { ServerContext } from "../../../../server.js";

type OrganizationCreditGrantFilters = {
  ids?: string[] | undefined;
  organization_ids?: string[] | undefined;
  grant_types?: OrganizationCreditGrantType[] | undefined;
  source_subscription_ids?: string[] | undefined;
  expires_after?: Date | undefined;
};

type ColumnKeys = Extract<keyof OrganizationCreditGrant, string>;

const list = (
  ctx: ServerContext,
): IOrganizationCreditGrantsRepository["list"] => {
  async function listOrganizationCreditGrants(params: {
    filters: OrganizationCreditGrantFilters;
  }): Promise<OrganizationCreditGrant[]>;
  async function listOrganizationCreditGrants<
    C extends readonly ColumnKeys[],
  >(params: {
    filters: OrganizationCreditGrantFilters;
    columns: C;
  }): Promise<Pick<OrganizationCreditGrant, C[number]>[]>;
  async function listOrganizationCreditGrants<
    C extends readonly ColumnKeys[],
  >({
    filters,
    columns,
  }: {
    filters: OrganizationCreditGrantFilters;
    columns?: C;
  }): Promise<
    OrganizationCreditGrant[] | Pick<OrganizationCreditGrant, C[number]>[]
  > {
    if (
      !filters.ids?.length &&
      !filters.organization_ids?.length &&
      !filters.grant_types?.length &&
      !filters.source_subscription_ids?.length &&
      !filters.expires_after
    ) {
      return [];
    }

    let query = ctx.db.selectFrom("organization_credit_grants");

    if (columns?.length) {
      query = query.select(columns);
    } else {
      query = query.selectAll();
    }

    if (filters.ids?.length) {
      query = query.where("id", "in", filters.ids);
    }

    if (filters.organization_ids?.length) {
      query = query.where("organization_id", "in", filters.organization_ids);
    }

    if (filters.grant_types?.length) {
      query = query.where("grant_type", "in", filters.grant_types);
    }

    if (filters.source_subscription_ids?.length) {
      query = query.where(
        "source_subscription_id",
        "in",
        filters.source_subscription_ids,
      );
    }

    if (filters.expires_after) {
      query = query.where("expires_at", ">", filters.expires_after);
    }

    const rows = await query.execute();

    return rows as
      | OrganizationCreditGrant[]
      | Pick<OrganizationCreditGrant, C[number]>[];
  }

  return listOrganizationCreditGrants;
};

export const OrganizationCreditGrantsRepository = (
  ctx: ServerContext,
): IOrganizationCreditGrantsRepository => ({
  async create(input): Promise<OrganizationCreditGrant> {
    const row = await ctx.db
      .insertInto("organization_credit_grants")
      .values(input)
      .returningAll()
      .executeTakeFirstOrThrow();

    return row;
  },
  list: list(ctx),
});
