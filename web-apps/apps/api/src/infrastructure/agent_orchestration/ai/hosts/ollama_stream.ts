import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText, type ModelMessage, type StreamTextResult, type ToolSet } from "ai";

import type { AppContext } from "../../../../server";
import { AgentOrchestrationException } from "../../../../domain/exceptions/exception";

export type OllamaStreamInput = {
  model: string;
  system: string;
  messages: Array<ModelMessage>;
  tools?: ToolSet;
  temperature?: number;
  maxOutputTokens?: number;
};

export async function streamTextViaOllama(
  ctx: AppContext,
  input: OllamaStreamInput,
): Promise<StreamTextResult<any, any>> {
  try {
    const baseUrl = ctx.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
    const normalized = /^https?:\/\//.test(baseUrl)
      ? baseUrl
      : `http://${baseUrl}`;

    const provider = createOpenAICompatible({
      name: "ollama",
      baseURL: `${normalized}/v1`,
      headers: {},
    });

    return streamText({
      model: provider(input.model),
      system: input.system,
      messages: input.messages,
      ...(input.tools === undefined ? {} : { tools: input.tools }),
      ...(input.temperature === undefined
        ? {}
        : { temperature: input.temperature }),
      ...(input.maxOutputTokens === undefined
        ? {}
        : { maxOutputTokens: input.maxOutputTokens }),
    });
  } catch (error) {
    throw new AgentOrchestrationException({
      public_message: "Text streaming failed.",
      message: "Ollama text streaming request failed.",
      cause: error,
    });
  }
}
