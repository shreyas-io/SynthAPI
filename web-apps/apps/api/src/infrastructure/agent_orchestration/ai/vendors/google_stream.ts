import { type ModelMessage, type StreamTextResult } from "ai";

import type { AppContext } from "../../../../application/agent_orchestration/context";
import type { GenerationRequest } from "../../../../domain/entities/agent_orchestration/generation";
import {
  AgentOrchestrationException,
  HttpStatusCode,
} from "../../../../domain/exceptions/exception";
import { streamTextViaCloudflareWorkersAi } from "../hosts/cloudflare_stream";
import { streamTextViaOpenRouter } from "../hosts/openrouter_stream";
import { toModelMessages } from "../to_model_messages";
import { toToolSet } from "../to_tool_set";

type RawContext = {
  model_provider: "google";
  model_host: "openrouter" | "workers_ai";
  messages: ModelMessage[];
};

const getRawContext = (request: GenerationRequest): RawContext => {
  if (request.raw === null) {
    return {
      model_provider: "google",
      model_host: request.config.model_host as "openrouter" | "workers_ai",
      messages: [],
    };
  }

  const raw = request.raw as any;

  if (
    raw?.model_provider === "google" &&
    raw?.model_host === request.config.model_host &&
    Array.isArray(raw?.messages)
  ) {
    return raw as RawContext;
  }

  throw new AgentOrchestrationException({
    public_message: "Invalid conversation context.",
    status_code: HttpStatusCode.BAD_REQUEST,
  });
};

export function streamTextViaGoogle(ctx: AppContext) {
  return {
    streamText: async (
      request: GenerationRequest,
    ): Promise<StreamTextResult<any, any>> => {
      if (
        request.config.model_host !== "openrouter" &&
        request.config.model_host !== "workers_ai"
      ) {
        throw new AgentOrchestrationException({
          public_message: `Host '${request.config.model_host}' is not supported for provider '${request.config.model_provider}'.`,
        });
      }

      const inputMessages = toModelMessages(request);
      const toolSet = toToolSet(request.config.custom_tools);

      const result =
        request.config.model_host === "workers_ai"
          ? await streamTextViaCloudflareWorkersAi(ctx, {
              model: request.config.model_id,
              system: request.config.system_prompt,
              messages: [...getRawContext(request).messages, ...inputMessages],
              temperature: request.config.temperature,
              maxOutputTokens: request.config.max_tokens,
              ...(toolSet === undefined ? {} : { tools: toolSet }),
            })
          : await streamTextViaOpenRouter(ctx, {
              model: request.config.model_id,
              system: request.config.system_prompt,
              messages: [...getRawContext(request).messages, ...inputMessages],
              temperature: request.config.temperature,
              maxOutputTokens: request.config.max_tokens,
              model_gateway: request.config.model_gateway,
              ...(toolSet === undefined ? {} : { tools: toolSet }),
            });

      return result;
    },
  };
}
