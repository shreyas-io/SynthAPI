export type ChatSession = {
  id: string;
  agent_config_id: string;
  project_id: string;
  name: string;
  description: string | null;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
};

export type ChatTurnStatus = {
  id: string;
  chat_session_id: string;
  status: "in_progress" | "completed" | "failed";
};

export type TextMessageItem = {
  type: "text";
  source: {
    type: "text";
    text: string;
  };
};

export type ChatTurnUserInput = Array<TextMessageItem>;

export type ToolUseDisplayBlock = {
  tool_use_id: string;
  label: string;
  content: Record<string, unknown>;
};

export type ChatTurnEventPayload =
  | {
      type: "user-input";
      input: ChatTurnUserInput;
    }
  | {
      type: "assistant-message";
      content: TextMessageItem[];
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
    }
  | {
      type: "turn-settled";
      status: "completed" | "failed";
      error?: string;
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
    }
  | {
      type: "error";
      error: string;
    };

export type ChatTurnEvent = {
  id: string;
  chat_turn_id: string;
  sequence: number;
  event_type:
    | "user-input"
    | "assistant-message"
    | "tool-input"
    | "tool-response"
    | "turn-settled";
  payload: ChatTurnEventPayload;
  created_at: string;
};

export type ChatStreamEvent =
  | ChatTurnStreamingEventPayload
  | ChatTurnEvent;
