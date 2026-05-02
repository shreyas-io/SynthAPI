import type { ColumnType } from "kysely";

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;

export type UsersTable = {
  id: ColumnType<string, string | undefined, never>;
  username: string;
  password_hash: string;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type AuthorizedSessionsTable = {
  id: ColumnType<string, string | undefined, never>;
  user_id: string;
  token_prefix: string;
  token_suffix: string;
  token_hash: string;
  expires_at: ColumnType<Date, Date | string, Date | string>;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type Database = {
  users: UsersTable;
  authorized_sessions: AuthorizedSessionsTable;
};
