import type { OrganizationCreditUsage } from "../../../entities/organization";

type OrganizationCreditUsageFilters = {
  ids?: string[] | undefined;
  organization_ids?: string[] | undefined;
  credit_grant_ids?: string[] | undefined;
  source_ids?: string[] | undefined;
};

type OrganizationCreditUsageInput = Pick<
  OrganizationCreditUsage,
  "organization_id" | "credit_grant_id" | "amount"
> &
  Partial<Pick<OrganizationCreditUsage, "source_id">>;
type ColumnKeys = Extract<keyof OrganizationCreditUsage, string>;

export interface IOrganizationCreditUsagesRepository {
  create: (
    input: OrganizationCreditUsageInput,
  ) => Promise<OrganizationCreditUsage>;
  list: {
    (params: {
      filters: OrganizationCreditUsageFilters;
    }): Promise<OrganizationCreditUsage[]>;
    <C extends readonly ColumnKeys[]>(params: {
      filters: OrganizationCreditUsageFilters;
      columns: C;
    }): Promise<Pick<OrganizationCreditUsage, C[number]>[]>;
  };
}
