import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, type ModelMessage, type ToolSet } from "ai";

import { AppContext } from "../../..";
import { AgentOrchestrationException } from "../../../exceptions/exception";

export type OllamaInput = {
  model: string;
  messages: Array<ModelMessage>;
  tools?: ToolSet;
  temperature?: number;
  maxOutputTokens?: number;
};

export async function generateTextViaOllama(
  ctx: AppContext,
  input: OllamaInput,
): Promise<Awaited<ReturnType<typeof generateText>>> {
  try {
    const baseUrl = ctx.environment.OLLAMA_BASE_URL ?? "http://localhost:11434";
    const normalized = /^https?:\/\//.test(baseUrl)
      ? baseUrl
      : `http://${baseUrl}`;

    const provider = createOpenAICompatible({
      name: "ollama",
      baseURL: `${normalized}/v1`,
      headers: {},
    });

    const val = await generateText({
      model: provider(input.model),
      messages: input.messages,
      tools: input.tools,
      temperature: input.temperature,
      maxOutputTokens: input.maxOutputTokens,
    });

    return val;
  } catch (error) {
    throw new AgentOrchestrationException({
      public_message: "Text generation failed.",
      message: `Ollama text generation request failed.`,
      cause: error,
    });
  }
}
