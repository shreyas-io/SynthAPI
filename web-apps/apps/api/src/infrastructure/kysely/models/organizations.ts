import type { ColumnType } from "kysely";

import type {
  OrganizationCreditGrantType,
  OrganizationMemberRole,
  OrganizationMembershipStatus,
  PlanSubscriptionStatus,
} from "../../../domain/entities/organization";

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;
type GeneratedUuid = ColumnType<string, string | undefined, never>;

export type OrganizationsTable = {
  id: GeneratedUuid;
  name: string;
  created_by_user_id: string;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type OrganizationMembershipsTable = {
  id: GeneratedUuid;
  organization_id: string;
  user_id: string;
  role: OrganizationMemberRole;
  status: OrganizationMembershipStatus;
  stale_reason: string | null;
  staled_at: ColumnType<Date | null, Date | string | null | undefined, Date | string | null>;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type PlanTypesTable = {
  id: GeneratedUuid;
  key: string;
  name: string;
  max_org_members: number;
  default_ai_credits: number;
  credit_grant_duration_days: number;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type OrganizationPlanSubscriptionsTable = {
  id: GeneratedUuid;
  organization_id: string;
  plan_type_id: string;
  status: PlanSubscriptionStatus;
  starts_at: ColumnType<Date, Date | string, Date | string>;
  expires_at: ColumnType<Date, Date | string, Date | string>;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type OrganizationCreditGrantsTable = {
  id: GeneratedUuid;
  organization_id: string;
  grant_type: OrganizationCreditGrantType;
  amount: number;
  source_subscription_id: string;
  expires_at: ColumnType<Date, Date | string, Date | string>;
  created_at: Timestamp;
};

export type OrganizationCreditUsagesTable = {
  id: GeneratedUuid;
  organization_id: string;
  credit_grant_id: string;
  amount: number;
  source_id: string | null;
  created_at: Timestamp;
};
