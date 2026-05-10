import { AppContext } from "../../..";
import {
  GenerationRequest,
  GenerationResponse,
} from "../../../domain/entities/generation";
import { ITextGeneration } from "../../../domain/entities/interfaces/text_generation";
import { AgentOrchestrationException } from "../../../exceptions/exception";
import { generateResponseViaPortkey } from "../hosts/portkey";
import { generateResponseViaWorkersAi } from "../hosts/workers_ai";

type PortkeyMessage = {
  role: string;
  content: string;
  tool_call_id?: string;
};

type ToolCall = {
  id?: string;
  call_id?: string;
  name?: string;
  function?: {
    name?: string;
    arguments?: string;
  };
  arguments?: string;
};

type ChatChoice = {
  message?: {
    content?: string | Array<unknown> | null;
    tool_calls?: ToolCall[];
  };
};

type ResponseOutputContent = {
  type?: string;
  text?: string;
};

type ResponseOutput = {
  type?: string;
  name?: string;
  call_id?: string;
  arguments?: string;
  content?: ResponseOutputContent[];
};

type TextGenerationResponse = {
  choices?: ChatChoice[];
  response?: string;
  output_text?: string;
  output?: ResponseOutput[];
  result?: TextGenerationResponse;
  body?: TextGenerationResponse;
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

const toMessages = (request: GenerationRequest): PortkeyMessage[] => {
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

const toInputText = (request: GenerationRequest) =>
  request.config.input_messages
    .flatMap((message) => {
      if (message.role === "tool_call_response") {
        return message.content.map(
          (toolResponse) =>
            `Tool ${toolResponse.name} (${toolResponse.tool_ref_id}) returned:\n${toolResponse.output}`,
        );
      }

      return `${message.role}: ${message.content.text}`;
    })
    .join("\n\n");

const toPortkeyResponsesInput = (request: GenerationRequest) => ({
  model: request.config.model_id,
  input: toInputText(request),
  tools: request.config.tools.length
    ? toResponsesApiTools(request.config.tools)
    : undefined,
  max_output_tokens: request.config.max_tokens,
});

const toResponsesApiTools = (tools: unknown[]) => {
  return tools.map((tool) => {
    if (
      tool &&
      typeof tool === "object" &&
      "type" in tool &&
      tool.type === "function" &&
      "function" in tool &&
      tool.function &&
      typeof tool.function === "object"
    ) {
      const functionTool = tool.function as {
        name?: unknown;
        description?: unknown;
        parameters?: unknown;
      };

      return {
        type: "function",
        name: functionTool.name,
        description: functionTool.description,
        parameters: functionTool.parameters,
      };
    }

    return tool;
  });
};

const toWorkersAiInput = (request: GenerationRequest) => ({
  model: request.config.model_id,
  input: toInputText(request),
  tools: request.config.tools.length
    ? toResponsesApiTools(request.config.tools)
    : undefined,
  max_tokens: request.config.max_tokens,
});

const getResponseBody = (response: TextGenerationResponse) =>
  response.body ?? response.result ?? response;

const addText = (content: GenerationResponse["content"], text?: string) => {
  const trimmed = text?.trim();

  if (!trimmed) return;

  content.push({
    role: "assistant",
    content: [{ type: "text", text: trimmed }],
  });
};

const addToolCalls = (
  content: GenerationResponse["content"],
  toolCalls: ToolCall[] | undefined,
) => {
  if (!toolCalls?.length) return;

  content.push({
    role: "tool_call_request",
    content: toolCalls.map((toolCall) => ({
      tool_ref_id: toolCall.id ?? toolCall.call_id ?? "",
      name: toolCall.function?.name ?? toolCall.name ?? "",
      input: toolCall.function?.arguments ?? toolCall.arguments ?? "",
      metadata: toolCall,
    })),
  });
};

const toGenerationResponse = (
  response: TextGenerationResponse,
): GenerationResponse => {
  const body = getResponseBody(response);
  const content: GenerationResponse["content"] = [];

  addText(content, body.response);
  addText(content, body.output_text);

  for (const choice of body.choices ?? []) {
    addText(content, contentToText(choice.message?.content));
    addToolCalls(content, choice.message?.tool_calls);
  }

  for (const output of body.output ?? []) {
    if (output.type === "message") {
      addText(
        content,
        output.content
          ?.map((item) => item.text ?? "")
          .join(""),
      );
    }

    if (output.type === "function_call") {
      addToolCalls(content, [output]);
    }
  }

  return {
    content,
    raw: response,
  };
};

export function generateTextViaOpenAi(ctx: AppContext): ITextGeneration {
  return {
    generateText: async (request: GenerationRequest) => {
      switch (request.config.model_host) {
        case "portkey":
          return toGenerationResponse(
            (await generateResponseViaPortkey(
              ctx,
              toPortkeyResponsesInput(request),
            )) as TextGenerationResponse,
          );
        case "workers_ai":
          return toGenerationResponse(
            (await generateResponseViaWorkersAi(
              ctx,
              toWorkersAiInput(request),
            )) as TextGenerationResponse,
          );
        default:
          throw new AgentOrchestrationException({
            public_message: `Host '${request.config.model_host}' is not supported for provider '${request.config.model_provider}'.`,
          });
      }
    },
  };
}
