import type { Organization } from "../../../entities/organization";

type OrganizationFilters = {
  ids?: string[] | undefined;
  created_by_user_ids?: string[] | undefined;
  name?: string | undefined;
};

type OrganizationInput = Pick<Organization, "name" | "created_by_user_id">;
type OrganizationUpdateInput = Partial<Pick<Organization, "name">>;
type ColumnKeys = Extract<keyof Organization, string>;

export interface IOrganizationsRepository {
  create: (input: OrganizationInput) => Promise<Organization>;
  list: {
    (params: { filters: OrganizationFilters }): Promise<Organization[]>;
    <C extends readonly ColumnKeys[]>(params: {
      filters: OrganizationFilters;
      columns: C;
    }): Promise<Pick<Organization, C[number]>[]>;
  };
  update: (id: string, input: OrganizationUpdateInput) => Promise<void>;
}
