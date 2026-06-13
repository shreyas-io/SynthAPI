import { type ModelMessage, type StreamTextResult } from "ai";

import type { AppContext } from "../../../../server";
import type { GenerationRequest } from "../../../../domain/entities/agent_orchestration/generation";
import {
  AgentOrchestrationException,
  HttpStatusCode,
} from "../../../../domain/exceptions/exception";
import { streamTextViaPortkey } from "../hosts/portkey_stream";
import { streamTextViaOpenRouter } from "../hosts/openrouter_stream";
import { toModelMessages } from "../to_model_messages";
import { toToolSet } from "../to_tool_set";

const getRawMessages = (request: GenerationRequest): ModelMessage[] => {
  if (request.raw === null) return [];
  if (Array.isArray(request.raw)) return request.raw as ModelMessage[];

  throw new AgentOrchestrationException({
    public_message: "Invalid conversation context.",
    status_code: HttpStatusCode.BAD_REQUEST,
  });
};

export function streamTextViaOpenAI(ctx: AppContext) {
  return {
    streamText: async (
      request: GenerationRequest,
    ): Promise<StreamTextResult<any, any>> => {
      if (
        request.config.model_host !== "openrouter" &&
        request.config.model_host !== "portkey"
      ) {
        throw new AgentOrchestrationException({
          public_message: `Host '${request.config.model_host}' is not supported for provider '${request.config.model_provider}'.`,
        });
      }

      const inputMessages = toModelMessages(request);
      const toolSet = toToolSet(request.config.custom_tools);

      const result =
        request.config.model_host === "portkey"
          ? await streamTextViaPortkey(ctx, {
              model: request.config.model_id,
              system: request.config.system_prompt,
              messages: [...getRawMessages(request), ...inputMessages],
              temperature: request.config.temperature,
              maxOutputTokens: request.config.max_tokens,
              thinking: request.config.thinking,
              model_gateway: request.config.model_gateway,
              ...(toolSet === undefined ? {} : { tools: toolSet }),
            })
          : await streamTextViaOpenRouter(ctx, {
              model: request.config.model_id,
              system: request.config.system_prompt,
              messages: [...getRawMessages(request), ...inputMessages],
              temperature: request.config.temperature,
              maxOutputTokens: request.config.max_tokens,
              thinking: request.config.thinking,
              model_gateway: request.config.model_gateway,
              ...(toolSet === undefined ? {} : { tools: toolSet }),
            });

      return result;
    },
  };
}
