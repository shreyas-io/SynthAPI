import { createOpenAI } from "@ai-sdk/openai";
import {
  streamText,
  type ModelMessage,
  type StreamTextResult,
  type ToolSet,
} from "ai";

import type { AppContext } from "../../../../server";
import { AgentOrchestrationException } from "../../../../domain/exceptions/exception";

export type PortkeyStreamInput = {
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

export async function streamTextViaPortkey(
  ctx: AppContext,
  input: PortkeyStreamInput,
): Promise<StreamTextResult<any, any>> {
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

    return streamText({
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
      public_message: "Text streaming failed.",
      message: "Portkey text streaming request failed.",
      cause: error,
    });
  }
}
