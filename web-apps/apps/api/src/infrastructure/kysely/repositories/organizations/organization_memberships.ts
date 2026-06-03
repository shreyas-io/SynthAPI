import type {
  OrganizationMemberRole,
  OrganizationMembership,
  OrganizationMembershipStatus,
} from "../../../../domain/entities/organization.js";
import type { IOrganizationMembershipsRepository } from "../../../../domain/interfaces/repositories/organizations/organization_memberships.js";
import type { ServerContext } from "../../../../server.js";

type OrganizationMembershipFilters = {
  ids?: string[] | undefined;
  organization_ids?: string[] | undefined;
  user_ids?: string[] | undefined;
  roles?: OrganizationMemberRole[] | undefined;
  statuses?: OrganizationMembershipStatus[] | undefined;
};

type ColumnKeys = Extract<keyof OrganizationMembership, string>;

const list = (
  ctx: ServerContext,
): IOrganizationMembershipsRepository["list"] => {
  async function listOrganizationMemberships(params: {
    filters: OrganizationMembershipFilters;
  }): Promise<OrganizationMembership[]>;
  async function listOrganizationMemberships<
    C extends readonly ColumnKeys[],
  >(params: {
    filters: OrganizationMembershipFilters;
    columns: C;
  }): Promise<Pick<OrganizationMembership, C[number]>[]>;
  async function listOrganizationMemberships<
    C extends readonly ColumnKeys[],
  >({
    filters,
    columns,
  }: {
    filters: OrganizationMembershipFilters;
    columns?: C;
  }): Promise<
    OrganizationMembership[] | Pick<OrganizationMembership, C[number]>[]
  > {
    if (
      !filters.ids?.length &&
      !filters.organization_ids?.length &&
      !filters.user_ids?.length &&
      !filters.roles?.length &&
      !filters.statuses?.length
    ) {
      return [];
    }

    let query = ctx.db.selectFrom("organization_memberships");

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

    if (filters.user_ids?.length) {
      query = query.where("user_id", "in", filters.user_ids);
    }

    if (filters.roles?.length) {
      query = query.where("role", "in", filters.roles);
    }

    if (filters.statuses?.length) {
      query = query.where("status", "in", filters.statuses);
    }

    const rows = await query.execute();

    return rows as
      | OrganizationMembership[]
      | Pick<OrganizationMembership, C[number]>[];
  }

  return listOrganizationMemberships;
};

export const OrganizationMembershipsRepository = (
  ctx: ServerContext,
): IOrganizationMembershipsRepository => ({
  async count({ filters }): Promise<number> {
    if (
      !filters.ids?.length &&
      !filters.organization_ids?.length &&
      !filters.user_ids?.length &&
      !filters.roles?.length &&
      !filters.statuses?.length
    ) {
      return 0;
    }

    let query = ctx.db
      .selectFrom("organization_memberships")
      .select((eb) => eb.fn.countAll<number>().as("count"));

    if (filters.ids?.length) {
      query = query.where("id", "in", filters.ids);
    }

    if (filters.organization_ids?.length) {
      query = query.where("organization_id", "in", filters.organization_ids);
    }

    if (filters.user_ids?.length) {
      query = query.where("user_id", "in", filters.user_ids);
    }

    if (filters.roles?.length) {
      query = query.where("role", "in", filters.roles);
    }

    if (filters.statuses?.length) {
      query = query.where("status", "in", filters.statuses);
    }

    const result = await query.executeTakeFirst();

    return Number(result?.count ?? 0);
  },
  async create(input): Promise<OrganizationMembership> {
    const row = await ctx.db
      .insertInto("organization_memberships")
      .values(input)
      .returningAll()
      .executeTakeFirstOrThrow();

    return row;
  },
  list: list(ctx),
  async update(id, input): Promise<void> {
    await ctx.db
      .updateTable("organization_memberships")
      .set(input)
      .where("id", "=", id)
      .execute();
  },
});
