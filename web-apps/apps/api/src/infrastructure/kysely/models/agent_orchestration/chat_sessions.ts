import type { ColumnType } from "kysely";
import type { Timestamp } from "./shared";

export type ChatSessionsTable = {
  id: ColumnType<string, string | undefined, never>;
  project_id: string;
  name: string;
  description: string | null;
  status: ColumnType<string, string | undefined, string>;
  created_at: Timestamp;
  updated_at: Timestamp;
};
