import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, type ModelMessage, type ToolSet } from "ai";

import { AppContext } from "../../..";
import { AgentOrchestrationException } from "../../../exceptions/exception";

export type CloudflareWorkersAiInput = {
  model: string;
  system: string;
  messages: Array<ModelMessage>;
  tools?: ToolSet;
  temperature?: number;
  maxOutputTokens?: number;
};

export async function generateTextViaCloudflareWorkersAi(
  ctx: AppContext,
  input: CloudflareWorkersAiInput,
): Promise<Awaited<ReturnType<typeof generateText>>> {
  try {
    const provider = createOpenAICompatible({
      name: "cloudflare-workers-ai",
      baseURL: `https://gateway.ai.cloudflare.com/v1/${ctx.environment.CLOUDFLARE_ACCOUNT_ID}/${ctx.environment.CLOUDFLARE_AI_GATEWAY_ID}/compat`,
      headers: {
        authorization: `Bearer ${ctx.environment.CLOUDFLARE_AI_GATEWAY_TOKEN}`,
      },
    });

    return await generateText({
      model: provider(input.model),
      system: input.system,
      messages: input.messages,
      tools: input.tools,
      temperature: input.temperature,
      maxOutputTokens: input.maxOutputTokens,
    });
  } catch (error) {
    throw new AgentOrchestrationException({
      public_message: "Text generation failed.",
      message: "Cloudflare Workers AI text generation request failed.",
      cause: error,
    });
  }
}
