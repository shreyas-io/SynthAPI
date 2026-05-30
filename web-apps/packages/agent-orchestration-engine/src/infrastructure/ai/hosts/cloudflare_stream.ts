import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText, type ModelMessage, type StreamTextResult, type ToolSet } from "ai";

import { AppContext } from "../../..";
import { AgentOrchestrationException } from "../../../exceptions/exception";

export type CloudflareWorkersAiStreamInput = {
  model: string;
  system: string;
  messages: Array<ModelMessage>;
  tools?: ToolSet;
  temperature?: number;
  maxOutputTokens?: number;
};

export async function streamTextViaCloudflareWorkersAi(
  ctx: AppContext,
  input: CloudflareWorkersAiStreamInput,
): Promise<StreamTextResult<any, any>> {
  try {
    const provider = createOpenAICompatible({
      name: "cloudflare-workers-ai",
      baseURL: `https://gateway.ai.cloudflare.com/v1/${ctx.environment.CLOUDFLARE_ACCOUNT_ID}/${ctx.environment.CLOUDFLARE_AI_GATEWAY_ID}/compat`,
      headers: {
        authorization: `Bearer ${ctx.environment.CLOUDFLARE_AI_GATEWAY_TOKEN}`,
      },
    });

    return streamText({
      model: provider(input.model),
      system: input.system,
      messages: input.messages,
      tools: input.tools,
      temperature: input.temperature,
      maxOutputTokens: input.maxOutputTokens,
    });
  } catch (error) {
    throw new AgentOrchestrationException({
      public_message: "Text streaming failed.",
      message: "Cloudflare Workers AI text streaming request failed.",
      cause: error,
    });
  }
}
