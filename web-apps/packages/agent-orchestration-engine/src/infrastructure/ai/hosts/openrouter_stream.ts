import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createAiGateway } from "ai-gateway-provider";
import { streamText, type ModelMessage, type StreamTextResult, type ToolSet } from "ai";

import { AppContext } from "../../../index.js";
import { AgentOrchestrationException } from "../../../exceptions/exception";

export type OpenRouterStreamInput = {
  model: string;
  system: string;
  messages: Array<ModelMessage>;
  tools?: ToolSet;
  temperature?: number;
  maxOutputTokens?: number;
  model_gateway: "cloudflare_aig" | null;
};

export async function streamTextViaOpenRouter(
  ctx: AppContext,
  input: OpenRouterStreamInput,
): Promise<StreamTextResult<any, any>> {
  try {
    const openrouter = createOpenRouter({
      apiKey: ctx.environment.OPENROUTER_API_KEY,
    });

    let model;

    if (input.model_gateway === "cloudflare_aig") {
      const gateway = createAiGateway({
        accountId: ctx.environment.CLOUDFLARE_ACCOUNT_ID,
        gateway: ctx.environment.CLOUDFLARE_AI_GATEWAY_ID,
        apiKey: ctx.environment.CLOUDFLARE_AI_GATEWAY_TOKEN,
      });
      model = gateway(openrouter(input.model));
    } else {
      model = openrouter(input.model);
    }

    return streamText({
      model,
      system: input.system,
      messages: input.messages,
      tools: input.tools,
      temperature: input.temperature,
      maxOutputTokens: input.maxOutputTokens,
    });
  } catch (error) {
    throw new AgentOrchestrationException({
      public_message: "Text streaming failed.",
      message: "OpenRouter text streaming request failed.",
      cause: error,
    });
  }
}
