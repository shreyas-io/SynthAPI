import type { ColumnType } from "kysely";
import type { Timestamp } from "./shared";

type GeneratedUuid = ColumnType<string, string | undefined, never>;

export type AgentRuntimeConfigTable = {
  id: GeneratedUuid;
  agent_config: ColumnType<string, string, string>;
  compaction_config: ColumnType<string, string, string>;
  created_at: Timestamp;
  updated_at: Timestamp;
};
