import type { AgentConfigsTable } from "./agent_configs";
import type { ChatSessionTurnsTable } from "./chat_session_turns";
import type { ChatSessionsTable } from "./chat_sessions";
import type { ChatTurnBlobsTable } from "./chat_turn_blobs";
import type { ChatTurnEventsTable } from "./chat_turn_events";

export type Database = {
  agent_configs: AgentConfigsTable;
  chat_sessions: ChatSessionsTable;
  chat_turn_blobs: ChatTurnBlobsTable;
  chat_session_turns: ChatSessionTurnsTable;
  chat_turn_events: ChatTurnEventsTable;
};
