import { type ModelMessage } from "ai";

import type { AppContext } from "../../../server";
import type { GenerationRequest } from "../../../domain/entities/agent_orchestration/generation";
import {
  AgentOrchestrationException,
  HttpStatusCode,
} from "../../../domain/exceptions/exception";
import { generateTextViaCloudflareWorkersAi } from "./hosts/cloudflare";
import { generateTextViaOllama } from "./hosts/ollama";
import { generateTextViaOpenRouter } from "./hosts/openrouter";
import { generateTextViaPortkey } from "./hosts/portkey";
import { toModelMessages } from "./to_model_messages";
import { toToolSet } from "./to_tool_set";

const getRawMessages = (request: GenerationRequest): ModelMessage[] => {
  if (request.raw === null) return [];
  if (Array.isArray(request.raw)) return request.raw as ModelMessage[];

  throw new AgentOrchestrationException({
    public_message: "Invalid conversation context.",
    status_code: HttpStatusCode.BAD_REQUEST,
  });
};

export function generateText(ctx: AppContext) {
  return {
    generateText: async (request: GenerationRequest): Promise<string> => {
      const inputMessages = toModelMessages(request);
      const toolSet = toToolSet(request.config.custom_tools);
      const input = {
        model: request.config.model_id,
        system: request.config.system_prompt,
        messages: [...getRawMessages(request), ...inputMessages],
        temperature: request.config.temperature,
        maxOutputTokens: request.config.max_tokens,
        model_gateway: request.config.model_gateway,
        ...(toolSet === undefined ? {} : { tools: toolSet }),
        ...(request.config.thinking === undefined
          ? {}
          : { thinking: request.config.thinking }),
      };

      switch (request.config.model_provider) {
        case "nvidia":
        case "openai":
          if (request.config.model_host === "portkey") {
            return (await generateTextViaPortkey(ctx, input)).text;
          }
          if (request.config.model_host === "openrouter") {
            return (await generateTextViaOpenRouter(ctx, input)).text;
          }
          break;
        case "google":
          if (request.config.model_host === "workers_ai") {
            return (await generateTextViaCloudflareWorkersAi(ctx, input)).text;
          }
          if (request.config.model_host === "portkey") {
            return (await generateTextViaPortkey(ctx, input)).text;
          }
          if (request.config.model_host === "openrouter") {
            return (await generateTextViaOpenRouter(ctx, input)).text;
          }
          break;
        case "meta":
          if (request.config.model_host === "ollama") {
            return (await generateTextViaOllama(ctx, input)).text;
          }
          break;
        default:
          break;
      }

      throw new AgentOrchestrationException({
        public_message: `Host '${request.config.model_host}' is not supported for provider '${request.config.model_provider}'.`,
      });
    },
  };
}
