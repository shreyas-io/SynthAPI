import type { LLMConfig } from "./generation";

export type TextMessageItem = {
  type: "text";
  source: {
    type: "text";
    text: string;
  };
};

export type FileMessageItem = {
  type: "file";
  source: {
    type: "blob_store";
    id: string;
  };
};

export type ChatTurnUserInput = Array<TextMessageItem | FileMessageItem>;

export type ConversationContext = {
  model_host: LLMConfig["model_host"];
  model_provider: LLMConfig["model_provider"];
  model_gateway: LLMConfig["model_gateway"];
  model_id: string;
  raw_context: unknown;
};

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
