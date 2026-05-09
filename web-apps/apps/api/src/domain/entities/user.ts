export type AuthUser = {
  id: string;
  username: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
};

export type User = AuthUser;
