import type { ColumnType } from "kysely";
import type { Timestamp } from "./shared";

export type ChatSessionsTable = {
  id: ColumnType<string, string | undefined, never>;
  agent_config_id: string;
  status: ColumnType<string, string | undefined, string>;
  created_at: Timestamp;
  updated_at: Timestamp;
};
