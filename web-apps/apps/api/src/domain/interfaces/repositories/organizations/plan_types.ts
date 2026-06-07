import type { PlanType } from "../../../entities/organization";

type PlanTypeFilters = {
  ids?: string[] | undefined;
  keys?: string[] | undefined;
};

type ColumnKeys = Extract<keyof PlanType, string>;

export interface IPlanTypesRepository {
  list: {
    (params: { filters: PlanTypeFilters }): Promise<PlanType[]>;
    <C extends readonly ColumnKeys[]>(params: {
      filters: PlanTypeFilters;
      columns: C;
    }): Promise<Pick<PlanType, C[number]>[]>;
  };
}
