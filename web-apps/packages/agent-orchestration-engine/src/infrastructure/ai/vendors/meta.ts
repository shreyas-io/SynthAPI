import {
  AssistantModelMessage,
  UserModelMessage,
  jsonSchema,
  type ModelMessage,
  type ToolSet,
} from "ai";

import { AppContext } from "../../..";
import {
  GenerationRequest,
  GenerationResponse,
} from "../../../domain/entities/generation";
import { ITextGeneration } from "../../../domain/entities/interfaces/text_generation";
import {
  AgentOrchestrationException,
  HttpStatusCode,
} from "../../../exceptions/exception";
import { generateTextViaOllama } from "../hosts/ollama";

type RawContext = {
  model_provider: "meta";
  model_host: "ollama";
  messages: ModelMessage[];
};

const getRawContext = (request: GenerationRequest): RawContext => {
  if (request.raw === null) {
    return {
      model_provider: "meta",
      model_host: "ollama",
      messages: [],
    };
  }

  const raw = request.raw as any;

  if (
    raw?.model_provider === "meta" &&
    raw?.model_host === "ollama" &&
    Array.isArray(raw?.messages)
  ) {
    return raw as RawContext;
  }

  throw new AgentOrchestrationException({
    public_message: "Invalid conversation context.",
    status_code: HttpStatusCode.BAD_REQUEST,
  });
};

const toModelMessages = (request: GenerationRequest): ModelMessage[] => {
  const messages: ModelMessage[] = [];

  for (const message of request.config.input_messages) {
    if (message.role === "tool_call_response") {
      for (const toolResponse of message.content) {
        messages.push({
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: toolResponse.tool_ref_id,
              toolName: toolResponse.name,
              output: { type: "text" as const, value: toolResponse.output },
            },
          ],
        });
      }

      continue;
    }

    messages.push({
      role: message.role,
      content: message.content.text,
    } as UserModelMessage | AssistantModelMessage);
  }

  return messages;
};

const toToolSet = (tools: Array<unknown>): ToolSet | undefined => {
  if (!tools.length) return undefined;

  const toolSet: ToolSet = {} as ToolSet;

  for (const tool of tools) {
    if (
      tool &&
      typeof tool === "object" &&
      "type" in tool &&
      tool.type === "function" &&
      "function" in tool
    ) {
      const fn = (tool as any).function;
      (toolSet as any)[fn.name] = {
        description: fn.description ?? "",
        inputSchema: jsonSchema(fn.parameters ?? { type: "object", properties: {} }),
      };
    }
  }

  return toolSet;
};

const toGenerationResponse = (
  request: GenerationRequest,
  result: Awaited<ReturnType<typeof generateTextViaOllama>>,
): GenerationResponse => {
  const content: GenerationResponse["content"] = [];
  const inputMessages = toModelMessages(request);
  const rawMessages = [...getRawContext(request).messages, ...inputMessages];

  const text = result.text?.trim();
  if (text) {
    content.push({
      role: "assistant",
      content: [{ type: "text", text }],
    });
  }

  if (result.toolCalls?.length) {
    content.push({
      role: "tool_call_request",
      content: result.toolCalls.map((tc: { toolCallId: string; toolName: string; input: unknown }) => ({
        tool_ref_id: tc.toolCallId,
        name: tc.toolName,
        input: JSON.stringify(tc.input),
        metadata: tc,
      })),
    });
  }

  return {
    content,
    raw: {
      model_provider: "meta",
      model_host: "ollama",
      messages: [...rawMessages, ...(result.response.messages as ModelMessage[])],
    },
  };
};

export function generateTextViaMeta(ctx: AppContext): ITextGeneration {
  return {
    generateText: async (request: GenerationRequest) => {
      if (request.config.model_host !== "ollama") {
        throw new AgentOrchestrationException({
          public_message: `Host '${request.config.model_host}' is not supported for provider '${request.config.model_provider}'.`,
        });
      }

      const inputMessages = toModelMessages(request);

      const result = await generateTextViaOllama(ctx, {
        model: request.config.model_id,
        messages: [...getRawContext(request).messages, ...inputMessages],
        tools: toToolSet(request.config.tools),
        temperature: request.config.temperature,
        maxOutputTokens: request.config.max_tokens,
      });

      return toGenerationResponse(request, result);
    },
  };
}
