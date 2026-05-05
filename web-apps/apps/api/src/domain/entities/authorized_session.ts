export type AuthorizedSession = {
  id: string;
  user_id: string;
  token_prefix: string;
  token_suffix: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
};
