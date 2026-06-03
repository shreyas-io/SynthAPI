import type {
  OrganizationPlanSubscription,
  PlanSubscriptionStatus,
} from "../../../../domain/entities/organization.js";
import type { IOrganizationPlanSubscriptionsRepository } from "../../../../domain/interfaces/repositories/organizations/organization_plan_subscriptions.js";
import type { ServerContext } from "../../../../server.js";

type OrganizationPlanSubscriptionFilters = {
  ids?: string[] | undefined;
  organization_ids?: string[] | undefined;
  plan_type_ids?: string[] | undefined;
  statuses?: PlanSubscriptionStatus[] | undefined;
  expires_after?: Date | undefined;
};

type ColumnKeys = Extract<keyof OrganizationPlanSubscription, string>;

const list = (
  ctx: ServerContext,
): IOrganizationPlanSubscriptionsRepository["list"] => {
  async function listOrganizationPlanSubscriptions(params: {
    filters: OrganizationPlanSubscriptionFilters;
  }): Promise<OrganizationPlanSubscription[]>;
  async function listOrganizationPlanSubscriptions<
    C extends readonly ColumnKeys[],
  >(params: {
    filters: OrganizationPlanSubscriptionFilters;
    columns: C;
  }): Promise<Pick<OrganizationPlanSubscription, C[number]>[]>;
  async function listOrganizationPlanSubscriptions<
    C extends readonly ColumnKeys[],
  >({
    filters,
    columns,
  }: {
    filters: OrganizationPlanSubscriptionFilters;
    columns?: C;
  }): Promise<
    | OrganizationPlanSubscription[]
    | Pick<OrganizationPlanSubscription, C[number]>[]
  > {
    if (
      !filters.ids?.length &&
      !filters.organization_ids?.length &&
      !filters.plan_type_ids?.length &&
      !filters.statuses?.length &&
      !filters.expires_after
    ) {
      return [];
    }

    let query = ctx.db.selectFrom("organization_plan_subscriptions");

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

    if (filters.plan_type_ids?.length) {
      query = query.where("plan_type_id", "in", filters.plan_type_ids);
    }

    if (filters.statuses?.length) {
      query = query.where("status", "in", filters.statuses);
    }

    if (filters.expires_after) {
      query = query.where("expires_at", ">", filters.expires_after);
    }

    const rows = await query.execute();

    return rows as
      | OrganizationPlanSubscription[]
      | Pick<OrganizationPlanSubscription, C[number]>[];
  }

  return listOrganizationPlanSubscriptions;
};

export const OrganizationPlanSubscriptionsRepository = (
  ctx: ServerContext,
): IOrganizationPlanSubscriptionsRepository => ({
  async create(input): Promise<OrganizationPlanSubscription> {
    const row = await ctx.db
      .insertInto("organization_plan_subscriptions")
      .values(input)
      .returningAll()
      .executeTakeFirstOrThrow();

    return row;
  },
  list: list(ctx),
  async update(id, input): Promise<void> {
    await ctx.db
      .updateTable("organization_plan_subscriptions")
      .set(input)
      .where("id", "=", id)
      .execute();
  },
});
