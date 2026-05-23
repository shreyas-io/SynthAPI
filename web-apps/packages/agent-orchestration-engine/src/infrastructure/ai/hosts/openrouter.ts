import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createAiGateway } from "ai-gateway-provider";
import { generateText, type ModelMessage, type ToolSet } from "ai";

import { AppContext } from "../../..";
import { AgentOrchestrationException } from "../../../exceptions/exception";

export type OpenRouterInput = {
  model: string;
  system: string;
  messages: Array<ModelMessage>;
  tools?: ToolSet;
  temperature?: number;
  maxOutputTokens?: number;
  model_gateway: "cloudflare_aig" | null;
};

export async function generateTextViaOpenRouter(
  ctx: AppContext,
  input: OpenRouterInput,
): Promise<Awaited<ReturnType<typeof generateText>>> {
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

    return await generateText({
      model,
      system: input.system,
      messages: input.messages,
      tools: input.tools,
      temperature: input.temperature,
      maxOutputTokens: input.maxOutputTokens,
    });
  } catch (error) {
    throw new AgentOrchestrationException({
      public_message: "Text generation failed.",
      message: `OpenRouter text generation request failed.`,
      cause: error,
    });
  }
}
