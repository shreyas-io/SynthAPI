import type { PlanType } from "../../../../domain/entities/organization.js";
import type { IPlanTypesRepository } from "../../../../domain/interfaces/repositories/organizations/plan_types.js";
import type { ServerContext } from "../../../../server.js";

type PlanTypeFilters = {
  ids?: string[] | undefined;
  keys?: string[] | undefined;
};

type ColumnKeys = Extract<keyof PlanType, string>;

const list = (ctx: ServerContext): IPlanTypesRepository["list"] => {
  async function listPlanTypes(params: {
    filters: PlanTypeFilters;
  }): Promise<PlanType[]>;
  async function listPlanTypes<C extends readonly ColumnKeys[]>(params: {
    filters: PlanTypeFilters;
    columns: C;
  }): Promise<Pick<PlanType, C[number]>[]>;
  async function listPlanTypes<C extends readonly ColumnKeys[]>({
    filters,
    columns,
  }: {
    filters: PlanTypeFilters;
    columns?: C;
  }): Promise<PlanType[] | Pick<PlanType, C[number]>[]> {
    if (!filters.ids?.length && !filters.keys?.length) {
      return [];
    }

    let query = ctx.db.selectFrom("plan_types");

    if (columns?.length) {
      query = query.select(columns);
    } else {
      query = query.selectAll();
    }

    if (filters.ids?.length) {
      query = query.where("id", "in", filters.ids);
    }

    if (filters.keys?.length) {
      query = query.where("key", "in", filters.keys);
    }

    const rows = await query.execute();

    return rows as PlanType[] | Pick<PlanType, C[number]>[];
  }

  return listPlanTypes;
};

export const PlanTypesRepository = (
  ctx: ServerContext,
): IPlanTypesRepository => ({
  list: list(ctx),
});
