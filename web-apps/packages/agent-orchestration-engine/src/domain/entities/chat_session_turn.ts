import type { ChatTurnUserInput, ConversationContext } from "./chat";

export type ChatSessionTurnEt = {
  id: string;
  chat_session_id: string;
  mode: "execution" | "planning";
  user_input: ChatTurnUserInput;
  conversation_context: ConversationContext | null;
  status: "in_progress" | "completed" | "failed";
  created_at: Date;
  updated_at: Date;
};
