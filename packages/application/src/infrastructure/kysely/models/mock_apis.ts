import type { ColumnType } from "kysely";

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;

export type MockApisTable = {
  id: ColumnType<string, string | undefined, never>;
  project_id: string;
  method: string;
  path: string;
  name: string;
  description: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};
