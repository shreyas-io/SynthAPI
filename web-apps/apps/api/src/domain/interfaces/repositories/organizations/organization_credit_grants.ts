import type {
  OrganizationCreditGrant,
  OrganizationCreditGrantType,
} from "../../../entities/organization";

type OrganizationCreditGrantFilters = {
  ids?: string[] | undefined;
  organization_ids?: string[] | undefined;
  grant_types?: OrganizationCreditGrantType[] | undefined;
  source_subscription_ids?: string[] | undefined;
  expires_after?: Date | undefined;
};

type OrganizationCreditGrantInput = Pick<
  OrganizationCreditGrant,
  | "organization_id"
  | "grant_type"
  | "amount"
  | "source_subscription_id"
  | "expires_at"
>;
type ColumnKeys = Extract<keyof OrganizationCreditGrant, string>;

export interface IOrganizationCreditGrantsRepository {
  create: (
    input: OrganizationCreditGrantInput,
  ) => Promise<OrganizationCreditGrant>;
  list: {
    (params: {
      filters: OrganizationCreditGrantFilters;
    }): Promise<OrganizationCreditGrant[]>;
    <C extends readonly ColumnKeys[]>(params: {
      filters: OrganizationCreditGrantFilters;
      columns: C;
    }): Promise<Pick<OrganizationCreditGrant, C[number]>[]>;
  };
}
