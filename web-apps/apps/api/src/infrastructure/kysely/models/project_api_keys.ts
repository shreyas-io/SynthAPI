import type { ColumnType } from "kysely";

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;

export type KeyEncryptionKeysTable = {
  id: ColumnType<string, string | undefined, never>;
  key_name: string;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type DataEncryptionKeysTable = {
  id: ColumnType<string, string | undefined, never>;
  key_encryption_key_id: string;
  algorithm: string;
  encrypted_key: string;
  iv: string;
  auth_tag: string;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type ProjectApiKeysTable = {
  id: ColumnType<string, string | undefined, never>;
  project_id: string;
  data_encryption_key_id: string;
  name: string;
  key_prefix: string;
  key_suffix: string;
  encrypted_key: string;
  iv: string;
  auth_tag: string;
  created_by_user_id: ColumnType<string | null, string | null | undefined, string | null>;
  deleted_at: ColumnType<Date | null, Date | string | null | undefined, Date | string | null>;
  created_at: Timestamp;
  updated_at: Timestamp;
};
