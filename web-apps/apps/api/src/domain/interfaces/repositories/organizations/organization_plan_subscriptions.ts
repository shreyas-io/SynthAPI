import type {
  OrganizationPlanSubscription,
  PlanSubscriptionStatus,
} from "../../../entities/organization";

type OrganizationPlanSubscriptionFilters = {
  ids?: string[] | undefined;
  organization_ids?: string[] | undefined;
  plan_type_ids?: string[] | undefined;
  statuses?: PlanSubscriptionStatus[] | undefined;
  expires_after?: Date | undefined;
};

type OrganizationPlanSubscriptionInput = Pick<
  OrganizationPlanSubscription,
  "organization_id" | "plan_type_id" | "status" | "starts_at" | "expires_at"
>;
type OrganizationPlanSubscriptionUpdateInput = Partial<
  Pick<OrganizationPlanSubscription, "status" | "expires_at">
>;
type ColumnKeys = Extract<keyof OrganizationPlanSubscription, string>;

export interface IOrganizationPlanSubscriptionsRepository {
  create: (
    input: OrganizationPlanSubscriptionInput,
  ) => Promise<OrganizationPlanSubscription>;
  list: {
    (params: {
      filters: OrganizationPlanSubscriptionFilters;
    }): Promise<OrganizationPlanSubscription[]>;
    <C extends readonly ColumnKeys[]>(params: {
      filters: OrganizationPlanSubscriptionFilters;
      columns: C;
    }): Promise<Pick<OrganizationPlanSubscription, C[number]>[]>;
  };
  update: (
    id: string,
    input: OrganizationPlanSubscriptionUpdateInput,
  ) => Promise<void>;
}
