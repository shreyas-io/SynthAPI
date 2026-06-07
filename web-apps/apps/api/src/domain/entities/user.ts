export type AuthUser = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  default_organization_id: string | null;
  created_at: Date;
  updated_at: Date;
};

export type User = AuthUser;
