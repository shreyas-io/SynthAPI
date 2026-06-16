import { createOpenAI } from "@ai-sdk/openai";
import { generateText, type ModelMessage, type ToolSet } from "ai";

import type { AppContext } from "../../../../server";
import { AgentOrchestrationException } from "../../../../domain/exceptions/exception";

export type PortkeyInput = {
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

export async function generateTextViaPortkey(
  ctx: AppContext,
  input: PortkeyInput,
): Promise<Awaited<ReturnType<typeof generateText>>> {
  try {
    if (input.model_gateway !== null) {
      throw new AgentOrchestrationException({
        public_message: `Gateway '${input.model_gateway}' is not supported for Portkey-hosted models.`,
      });
    }

    const openai = createOpenAI({
      baseURL: "https://api.portkey.ai/v1",
      apiKey: ctx.env.PORTKEY_API_KEY,
    });

    return await generateText({
      model: openai.chat(input.model),
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
              openai: {
                reasoningEffort: input.thinking.effort,
              },
            },
          }),
    });
  } catch (error) {
    throw new AgentOrchestrationException({
      public_message: "Text generation failed.",
      message: "Portkey text generation request failed.",
      cause: error,
    });
  }
}
