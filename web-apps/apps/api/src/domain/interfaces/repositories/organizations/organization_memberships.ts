import type {
  OrganizationMemberRole,
  OrganizationMembership,
  OrganizationMembershipStatus,
} from "../../../entities/organization";

type OrganizationMembershipFilters = {
  ids?: string[] | undefined;
  organization_ids?: string[] | undefined;
  user_ids?: string[] | undefined;
  roles?: OrganizationMemberRole[] | undefined;
  statuses?: OrganizationMembershipStatus[] | undefined;
};

type OrganizationMembershipInput = Pick<
  OrganizationMembership,
  "organization_id" | "user_id" | "role" | "status"
> &
  Partial<Pick<OrganizationMembership, "stale_reason" | "staled_at">>;
type OrganizationMembershipUpdateInput = Partial<
  Pick<
    OrganizationMembership,
    "role" | "status" | "stale_reason" | "staled_at"
  >
>;
type ColumnKeys = Extract<keyof OrganizationMembership, string>;

export interface IOrganizationMembershipsRepository {
  count: (params: {
    filters: OrganizationMembershipFilters;
  }) => Promise<number>;
  create: (
    input: OrganizationMembershipInput,
  ) => Promise<OrganizationMembership>;
  list: {
    (params: {
      filters: OrganizationMembershipFilters;
    }): Promise<OrganizationMembership[]>;
    <C extends readonly ColumnKeys[]>(params: {
      filters: OrganizationMembershipFilters;
      columns: C;
    }): Promise<Pick<OrganizationMembership, C[number]>[]>;
  };
  update: (
    id: string,
    input: OrganizationMembershipUpdateInput,
  ) => Promise<void>;
}
