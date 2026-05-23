import type { LLMConfig } from "./generation";

export type ChatTurnBlobMimeType =
  | "text/plain"
  | "text/markdown"
  | "text/csv"
  | "application/json"
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type TextMessageItem = {
  type: "text";
  source: {
    type: "text";
    text: string;
  };
};

type FileMessageItem = {
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

type ToolUseDisplayBlock = {
  tool_use_id: string;
  label: string;
  content: string;
};

export type ChatTurnEventType =
  | "user_input"
  | "assistant_delta"
  | "assistant_message"
  | "tool_call_request"
  | "tool_call_response";

export type ChatTurnEventPayload =
  | {
      type: "user_input";
      input: ChatTurnUserInput;
    }
  | {
      type: "assistant_delta";
      text: string;
    }
  | {
      type: "assistant_message";
      content: Array<TextMessageItem>;
    }
  | {
      type: "tool_call_request";
      input: ToolUseDisplayBlock;
    }
  | {
      type: "tool_call_response";
      output: ToolUseDisplayBlock & {
        status: "success" | "failed";
      };
    };
