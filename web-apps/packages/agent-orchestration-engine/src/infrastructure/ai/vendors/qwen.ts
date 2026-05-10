import { AppContext } from "../../..";
import {
  GenerationRequest,
  GenerationResponse,
} from "../../../domain/entities/generation";
import { ITextGeneration } from "../../../domain/entities/interfaces/text_generation";
import { AgentOrchestrationException } from "../../../exceptions/exception";
import { generateTextViaPortkey } from "../hosts/portkey";

type PortkeyMessage = {
  role: string;
  content: string;
  tool_call_id?: string;
};

type PortkeyToolCall = {
  id?: string;
  function?: {
    name?: string;
    arguments?: string;
  };
};

type PortkeyChoice = {
  message?: {
    content?: string | Array<unknown> | null;
    tool_calls?: PortkeyToolCall[];
  };
};

type PortkeyResponse = {
  choices?: PortkeyChoice[];
};

const contentToText = (content: string | Array<unknown> | null | undefined) => {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map((item) => {
      if (typeof item === "string") return item;
      if (
        item &&
        typeof item === "object" &&
        "text" in item &&
        typeof item.text === "string"
      ) {
        return item.text;
      }

      return "";
    })
    .join("");
};

const splitThinking = (text: string) => {
  const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/);

  if (thinkMatch) {
    return {
      thinking: thinkMatch[1]?.trim() ?? "",
      assistant: text.replace(thinkMatch[0], "").trim(),
    };
  }

  const endThink = "</think>";
  const endIndex = text.indexOf(endThink);

  if (endIndex >= 0) {
    return {
      thinking: text.slice(0, endIndex).trim(),
      assistant: text.slice(endIndex + endThink.length).trim(),
    };
  }

  return {
    thinking: "",
    assistant: text.trim(),
  };
};

const toPortkeyMessages = (request: GenerationRequest): PortkeyMessage[] => {
  const messages: PortkeyMessage[] = [];

  for (const message of request.config.input_messages) {
    if (message.role === "tool_call_response") {
      for (const toolResponse of message.content) {
        messages.push({
          role: "tool",
          tool_call_id: toolResponse.tool_ref_id,
          content: toolResponse.output,
        });
      }

      continue;
    }

    messages.push({
      role: message.role,
      content: message.content.text,
    });
  }

  return messages;
};

const toPortkeyInput = (request: GenerationRequest) => ({
  model: request.config.model_id,
  messages: toPortkeyMessages(request),
  tools: request.config.tools.length ? request.config.tools : undefined,
  temperature: request.config.temperature,
  max_tokens: request.config.max_tokens,
});

const toGenerationResponse = (response: PortkeyResponse): GenerationResponse => {
  const content: GenerationResponse["content"] = [];

  for (const choice of response.choices ?? []) {
    const message = choice.message;
    const text = contentToText(message?.content);
    const { thinking, assistant } = splitThinking(text);

    if (thinking) {
      content.push({
        role: "thinking",
        content: [{ type: "text", text: thinking }],
      });
    }

    if (assistant) {
      content.push({
        role: "assistant",
        content: [{ type: "text", text: assistant }],
      });
    }

    if (message?.tool_calls?.length) {
      content.push({
        role: "tool_call_request",
        content: message.tool_calls.map((toolCall) => ({
          tool_ref_id: toolCall.id ?? "",
          name: toolCall.function?.name ?? "",
          input: toolCall.function?.arguments ?? "",
          metadata: toolCall,
        })),
      });
    }
  }

  return {
    content,
    raw: response,
  };
};

export function generateTextViaQwen(ctx: AppContext): ITextGeneration {
  return {
    generateText: async (request: GenerationRequest) => {
      switch (request.config.model_host) {
        case "portkey":
          return toGenerationResponse(
            (await generateTextViaPortkey(
              ctx,
              toPortkeyInput(request),
            )) as PortkeyResponse,
          );
        default:
          throw new AgentOrchestrationException({
            public_message: `Host '${request.config.model_host}' is not supported for provider '${request.config.model_provider}'.`,
          });
      }
    },
  };
}
