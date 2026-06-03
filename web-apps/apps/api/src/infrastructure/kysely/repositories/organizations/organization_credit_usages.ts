import type { OrganizationCreditUsage } from "../../../../domain/entities/organization.js";
import type { IOrganizationCreditUsagesRepository } from "../../../../domain/interfaces/repositories/organizations/organization_credit_usages.js";
import type { ServerContext } from "../../../../server.js";

type OrganizationCreditUsageFilters = {
  ids?: string[] | undefined;
  organization_ids?: string[] | undefined;
  credit_grant_ids?: string[] | undefined;
  source_ids?: string[] | undefined;
};

type ColumnKeys = Extract<keyof OrganizationCreditUsage, string>;

const list = (
  ctx: ServerContext,
): IOrganizationCreditUsagesRepository["list"] => {
  async function listOrganizationCreditUsages(params: {
    filters: OrganizationCreditUsageFilters;
  }): Promise<OrganizationCreditUsage[]>;
  async function listOrganizationCreditUsages<
    C extends readonly ColumnKeys[],
  >(params: {
    filters: OrganizationCreditUsageFilters;
    columns: C;
  }): Promise<Pick<OrganizationCreditUsage, C[number]>[]>;
  async function listOrganizationCreditUsages<
    C extends readonly ColumnKeys[],
  >({
    filters,
    columns,
  }: {
    filters: OrganizationCreditUsageFilters;
    columns?: C;
  }): Promise<
    OrganizationCreditUsage[] | Pick<OrganizationCreditUsage, C[number]>[]
  > {
    if (
      !filters.ids?.length &&
      !filters.organization_ids?.length &&
      !filters.credit_grant_ids?.length &&
      !filters.source_ids?.length
    ) {
      return [];
    }

    let query = ctx.db.selectFrom("organization_credit_usages");

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

    if (filters.credit_grant_ids?.length) {
      query = query.where("credit_grant_id", "in", filters.credit_grant_ids);
    }

    if (filters.source_ids?.length) {
      query = query.where("source_id", "in", filters.source_ids);
    }

    const rows = await query.execute();

    return rows as
      | OrganizationCreditUsage[]
      | Pick<OrganizationCreditUsage, C[number]>[];
  }

  return listOrganizationCreditUsages;
};

export const OrganizationCreditUsagesRepository = (
  ctx: ServerContext,
): IOrganizationCreditUsagesRepository => ({
  async create(input): Promise<OrganizationCreditUsage> {
    const row = await ctx.db
      .insertInto("organization_credit_usages")
      .values({
        ...input,
        source_id: input.source_id ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return row;
  },
  list: list(ctx),
});
