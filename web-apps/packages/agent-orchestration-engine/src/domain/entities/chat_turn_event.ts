import type { ChatTurnUserInput } from "./chat_session_turn";

type TextMessageItem = {
  type: "text";
  source: {
    type: "text";
    text: string;
  };
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

export type ChatTurnEventEt = {
  id: string;
  chat_turn_id: string;
  sequence: number;
  event_type: ChatTurnEventType;
  payload: ChatTurnEventPayload;
  created_at: Date;
};
