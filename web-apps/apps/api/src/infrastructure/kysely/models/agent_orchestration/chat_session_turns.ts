import type { ColumnType } from "kysely";
import type { ChatTurnUserInput } from "../../../../domain/entities/agent_orchestration/chat_session_turn";
import type { JsonValue, Timestamp } from "./shared";

export type ChatSessionTurnsTable = {
  id: ColumnType<string, string | undefined, never>;
  chat_session_id: string;
  mode: string;
  user_input: ColumnType<ChatTurnUserInput, JsonValue | string, JsonValue | string>;
  conversation_context: ColumnType<
    JsonValue | null,
    JsonValue | string | null | undefined,
    JsonValue | string | null
  >;
  status: ColumnType<string, string | undefined, string>;
  created_at: Timestamp;
  updated_at: Timestamp;
};
