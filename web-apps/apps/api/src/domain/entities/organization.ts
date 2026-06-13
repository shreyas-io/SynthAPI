export type OrganizationMemberRole = "owner" | "admin" | "member";

export type OrganizationMembershipStatus = "active" | "stale";

export type PlanSubscriptionStatus = "active" | "cancelled" | "expired";

type OrganizationInviteStatus = "pending" | "accepted" | "expired" | "revoked";

export type OrganizationCreditGrantType = "ai_credits";

export type Organization = {
  id: string;
  name: string;
  created_by_user_id: string;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type OrganizationMembership = {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationMemberRole;
  status: OrganizationMembershipStatus;
  stale_reason: string | null;
  staled_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type OrganizationInviteEt = {
  id: string;
  organization_id: string;
  email: string;
  invited_by_user_id: string;
  role: OrganizationMemberRole;
  status: OrganizationInviteStatus;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
};

export type PlanType = {
  id: string;
  key: string;
  name: string;
  max_org_members: number;
  default_ai_credits: number;
  credit_grant_duration_days: number;
  created_at: Date;
  updated_at: Date;
};

export type OrganizationPlanSubscription = {
  id: string;
  organization_id: string;
  plan_type_id: string;
  status: PlanSubscriptionStatus;
  starts_at: Date;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
};

export type OrganizationCreditGrant = {
  id: string;
  organization_id: string;
  grant_type: OrganizationCreditGrantType;
  amount: number;
  source_subscription_id: string;
  expires_at: Date;
  created_at: Date;
};

export type OrganizationCreditUsage = {
  id: string;
  organization_id: string;
  credit_grant_id: string;
  amount: number;
  source_id: string | null;
  created_at: Date;
};
