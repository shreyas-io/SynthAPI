import type { ColumnType } from "kysely";
import type { JsonValue, Timestamp } from "./shared";

export type ChatSessionTurnsTable = {
  id: ColumnType<string, string | undefined, never>;
  chat_session_id: string;
  mode: string;
  user_input: ColumnType<JsonValue, JsonValue | string, JsonValue | string>;
  conversation_context: ColumnType<
    JsonValue | null,
    JsonValue | string | null | undefined,
    JsonValue | string | null
  >;
  status: ColumnType<string, string | undefined, string>;
  created_at: Timestamp;
  updated_at: Timestamp;
};
