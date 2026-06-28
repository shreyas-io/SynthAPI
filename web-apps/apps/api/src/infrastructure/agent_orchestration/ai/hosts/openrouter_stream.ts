import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createAiGateway } from "ai-gateway-provider";
import {
  streamText,
  type ModelMessage,
  type StreamTextResult,
  type ToolSet,
} from "ai";

import type { AppContext } from "../../../../server";
import { AgentOrchestrationException } from "../../../../domain/exceptions/exception";

export type OpenRouterStreamInput = {
  model: string;
  system: string;
  messages: Array<ModelMessage>;
  tools?: ToolSet;
  temperature?: number;
  maxOutputTokens?: number;
  model_gateway: "cloudflare_aig" | null;
  thinking?: {
    effort: "none" | "minimal" | "low" | "medium" | "high" | "xhigh";
  };
};

function getModel(ctx: AppContext, input: OpenRouterStreamInput): any {
  if (!ctx.env.OPENROUTER_API_KEY) {
    throw new AgentOrchestrationException({
      public_message: "OpenRouter is not configured.",
      message: "OPENROUTER_API_KEY is required for OpenRouter-hosted models.",
    });
  }

  const openrouter = createOpenRouter({
    apiKey: ctx.env.OPENROUTER_API_KEY,
  });

  let model;

  if (input.model_gateway === "cloudflare_aig") {
    const gateway = createAiGateway({
      accountId: ctx.env.CLOUDFLARE_ACCOUNT_ID,
      gateway: ctx.env.CLOUDFLARE_AI_GATEWAY_ID,
      apiKey: ctx.env.CLOUDFLARE_AI_GATEWAY_TOKEN,
    });
    model = gateway(openrouter(input.model));
  } else {
    model = openrouter(input.model);
  }

  return model;
}

export async function streamTextViaOpenRouter(
  ctx: AppContext,
  input: OpenRouterStreamInput,
): Promise<StreamTextResult<any, any>> {
  try {
    if (!ctx.env.OPENROUTER_API_KEY) {
      throw new AgentOrchestrationException({
        public_message: "OpenRouter is not configured.",
        message: "OPENROUTER_API_KEY is required for OpenRouter-hosted models.",
      });
    }

    try {
      const model = getModel(ctx, input);
      return await streamText({
        model,
        system: input.system,
        messages: input.messages,
        ...(input.tools === undefined ? {} : { tools: input.tools }),
        ...(input.temperature === undefined
          ? {}
          : { temperature: input.temperature }),
        ...(input.maxOutputTokens === undefined
          ? {}
          : { maxOutputTokens: input.maxOutputTokens }),
        ...(input.thinking === undefined
          ? {}
          : {
              providerOptions: {
                openrouter: {
                  reasoning: {
                    effort: input.thinking.effort,
                  },
                },
              },
            }),
      });
    } catch (e) {
      if (input.model.endsWith(":free")) {
        // retry with a non-free model in case of errors
        const model = getModel(ctx, {
          ...input,
          model: input.model.replaceAll(":free", ""),
        });
        return await streamText({
          model,
          system: input.system,
          messages: input.messages,
          ...(input.tools === undefined ? {} : { tools: input.tools }),
          ...(input.temperature === undefined
            ? {}
            : { temperature: input.temperature }),
          ...(input.maxOutputTokens === undefined
            ? {}
            : { maxOutputTokens: input.maxOutputTokens }),
          ...(input.thinking === undefined
            ? {}
            : {
                providerOptions: {
                  openrouter: {
                    reasoning: {
                      effort: input.thinking.effort,
                    },
                  },
                },
              }),
        });
      }

      throw e;
    }
  } catch (error) {
    throw new AgentOrchestrationException({
      public_message: "Text streaming failed.",
      message: "OpenRouter text streaming request failed.",
      cause: error,
    });
  }
}
