import type { ColumnType } from "kysely";
import type { JsonValue, Timestamp } from "./shared";

export type AgentConfigsTable = {
  id: ColumnType<string, string | undefined, never>;
  key: string;
  name: string;
  description: string | null;
  pricing_config: ColumnType<
    JsonValue,
    JsonValue | string | undefined,
    JsonValue | string
  >;
  chat_config: ColumnType<JsonValue, JsonValue | string, JsonValue | string>;
  chat_fallback_config: ColumnType<
    JsonValue,
    JsonValue | string,
    JsonValue | string
  >;
  planning_config: ColumnType<
    JsonValue,
    JsonValue | string,
    JsonValue | string
  >;
  compaction_config: ColumnType<
    JsonValue,
    JsonValue | string,
    JsonValue | string
  >;
  compaction_threshold_tokens: ColumnType<
    number,
    number | undefined,
    number
  >;
  enabled: ColumnType<boolean, boolean | undefined, boolean>;
  created_at: Timestamp;
  updated_at: Timestamp;
};
