export type AiCredits = {
  granted: number;
  used: number;
  remaining: number;
};

export type ProfileOrganization = {
  id: string;
  name: string;
  created_by_user_id: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  membership: {
    role: "owner" | "admin" | "member";
    status: "active" | "stale";
    stale_reason: string | null;
    staled_at: string | null;
  };
  plan: {
    subscription_id: string;
    key: string;
    name: string;
    status: "active" | "cancelled" | "expired";
    starts_at: string;
    expires_at: string;
    max_org_members: number | null;
    default_ai_credits: number | null;
  } | null;
  ai_credits: AiCredits;
};

export type ProfileUser = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  default_organization_id: string | null;
};

export type Profile = {
  user: ProfileUser;
  organizations: ProfileOrganization[];
};
