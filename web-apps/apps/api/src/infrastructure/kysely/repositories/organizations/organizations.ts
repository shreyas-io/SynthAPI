import type { Organization } from "../../../../domain/entities/organization.js";
import type { IOrganizationsRepository } from "../../../../domain/interfaces/repositories/organizations/organizations.js";
import type { ServerContext } from "../../../../server.js";

type OrganizationFilters = {
  ids?: string[] | undefined;
  created_by_user_ids?: string[] | undefined;
  name?: string | undefined;
};

type ColumnKeys = Extract<keyof Organization, string>;

const list = (ctx: ServerContext): IOrganizationsRepository["list"] => {
  async function listOrganizations(params: {
    filters: OrganizationFilters;
  }): Promise<Organization[]>;
  async function listOrganizations<C extends readonly ColumnKeys[]>(params: {
    filters: OrganizationFilters;
    columns: C;
  }): Promise<Pick<Organization, C[number]>[]>;
  async function listOrganizations<C extends readonly ColumnKeys[]>({
    filters,
    columns,
  }: {
    filters: OrganizationFilters;
    columns?: C;
  }): Promise<Organization[] | Pick<Organization, C[number]>[]> {
    if (
      !filters.ids?.length &&
      !filters.created_by_user_ids?.length &&
      !filters.name
    ) {
      return [];
    }

    let query = ctx.db.selectFrom("organizations");

    if (columns?.length) {
      query = query.select(columns);
    } else {
      query = query.selectAll();
    }

    if (filters.ids?.length) {
      query = query.where("id", "in", filters.ids);
    }

    if (filters.created_by_user_ids?.length) {
      query = query.where("created_by_user_id", "in", filters.created_by_user_ids);
    }

    if (filters.name) {
      query = query.where("name", "ilike", `%${filters.name}%`);
    }

    const rows = await query.execute();

    return rows as Organization[] | Pick<Organization, C[number]>[];
  }

  return listOrganizations;
};

export const OrganizationsRepository = (
  ctx: ServerContext,
): IOrganizationsRepository => ({
  async create(input): Promise<Organization> {
    const row = await ctx.db
      .insertInto("organizations")
      .values(input)
      .returningAll()
      .executeTakeFirstOrThrow();

    return row;
  },
  list: list(ctx),
  async update(id, input): Promise<void> {
    await ctx.db
      .updateTable("organizations")
      .set(input)
      .where("id", "=", id)
      .execute();
  },
});
