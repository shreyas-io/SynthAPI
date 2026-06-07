export type AuthProviderName = "google";

export type AuthIdentity = {
  id: string;
  provider: AuthProviderName;
  provider_subject: string;
  user_id: string;
  created_at: Date;
  updated_at: Date;
};
