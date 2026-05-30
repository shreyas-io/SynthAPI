import { type ModelMessage, type StreamTextResult } from "ai";

import { AppContext } from "../../..";
import { GenerationRequest } from "../../../domain/entities/generation";
import {
  AgentOrchestrationException,
  HttpStatusCode,
} from "../../../exceptions/exception";
import { streamTextViaOllama } from "../hosts/ollama_stream";
import { toModelMessages } from "../to_model_messages";
import { toToolSet } from "../to_tool_set";

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

export function streamTextViaMeta(ctx: AppContext) {
  return {
    streamText: async (
      request: GenerationRequest,
    ): Promise<StreamTextResult<any, any>> => {
      if (request.config.model_host !== "ollama") {
        throw new AgentOrchestrationException({
          public_message: `Host '${request.config.model_host}' is not supported for provider '${request.config.model_provider}'.`,
        });
      }

      const inputMessages = toModelMessages(request);

      const result = await streamTextViaOllama(ctx, {
        model: request.config.model_id,
        system: request.config.system_prompt,
        messages: [...getRawContext(request).messages, ...inputMessages],
        tools: toToolSet(request.config.custom_tools),
        temperature: request.config.temperature,
        maxOutputTokens: request.config.max_tokens,
      });

      return result;
    },
  };
}
