type ToolCallRequest = {
  tool_ref_id: string; // vendor tool reference ID
  name: string;
  input: string;
  metadata?: unknown; // any vendor specific metadata if needed
};

type ToolCallResponse = {
  tool_ref_id: string;
  name: string;
  output: string;
};

type TextMessageContent = {
  type: "text";
  text: string;
};

type LLMConfig = {
  model_host: "openrouter" | "ollama" | "workers_ai";
  model_provider: "nvidia" | "google" | "meta";
  model_gateway: "cloudflare_aig" | null;
  model_id: string;
  input_messages: Array<
    | {
        role: "user";
        content: TextMessageContent;
      }
    | {
        role: "assistant"; // optionally to be used as an assistant pre-fill if required
        content: TextMessageContent;
      }
    | {
        role: "tool_call_response";
        content: Array<ToolCallResponse>;
      }
  >;
  tools: Array<unknown>;
  temperature: number;
  max_tokens: number;
};

export type GenerationRequest = {
  config: LLMConfig;
  raw: unknown | null; // optionally, used for getting context from previous run.
};

export type GenerationResponse = {
  content: Array<
    | {
        role: "assistant";
        content: Array<TextMessageContent>;
      }
    | {
        role: "thinking";
        content: Array<TextMessageContent>;
      }
    | {
        role: "tool_call_request"; // kept inline to keep the order for interleaved assistant message and tool blocks
        content: Array<ToolCallRequest>;
      }
    | {
        role: "tool_call_response"; // for server tools, the assistant gives both tool call requests and response
        content: Array<ToolCallResponse>;
      }
  >;
  raw: unknown | null;
};
