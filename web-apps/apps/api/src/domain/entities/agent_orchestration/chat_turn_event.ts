import type { ChatTurnUserInput, TextMessageItem } from "./chat_session_turn";

type ToolUseDisplayBlock = {
  tool_use_id: string;
  label: string;
  content: Record<string, any>;
};

export type ChatTurnEventType =
  | "user-input"
  | "assistant-message"
  | "tool-input"
  | "tool-response";

type ChatTurnStreamingEventType =
  | ChatTurnEventType
  | "assistant-delta"
  | "reasoning-delta"
  | "tool-input-start";

export type ChatTurnEventPayload =
  | {
      type: "user-input";
      input: ChatTurnUserInput;
    }
  | {
      type: "assistant-message";
      content: Array<TextMessageItem>;
    }
  | {
      type: "tool-input";
      input: ToolUseDisplayBlock;
    }
  | {
      type: "tool-result";
      output: ToolUseDisplayBlock & {
        status: "success" | "failed";
      };
    };

export type ChatTurnStreamingEventPayload =
  | ChatTurnEventPayload
  | {
      type: "assistant-delta";
      text: string;
    }
  | {
      type: "reasoning-delta";
      text: string;
    }
  | {
      type: "tool-input-start";
      text: string;
    };

// the event being stored inside DB
export type ChatTurnEventEt = {
  id: string;
  chat_turn_id: string;
  sequence: number;
  event_type: ChatTurnEventType;
  payload: ChatTurnEventPayload;
  created_at: Date;
};

// the event being streamed to the end-user
export type ChatTurnStreamingEventEt = {
  id: string;
  event_type: ChatTurnStreamingEventType;
  payload: ChatTurnStreamingEventPayload;
};
