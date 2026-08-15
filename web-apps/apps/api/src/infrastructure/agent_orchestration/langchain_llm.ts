import { ChatOpenAI } from "@langchain/openai";
import { modelFallbackMiddleware } from "langchain";
import type {
  AgentModelConfig,
  AgentCompactionConfig,
} from "../../domain/configs/agent-config/config";
import {
  HttpStatusCode,
  MockApiException,
} from "../../domain/exceptions/exception";
import { AppContext } from "../../server";
import { createHeaders } from "portkey-ai";
import { setTimeout as sleep } from "node:timers/promises";

const MAX_ATTEMPTS = 3;

/**
 * True when a model message carries usable output: non-empty text content or at
 * least one tool call. Uses the canonical top-level `tool_calls` field (and
 * `tool_call_chunks` for streamed chunks) rather than the deprecated
 * `additional_kwargs.tool_calls`.
 */
function hasOutput(message: any): boolean {
  const { content } = message ?? {};
  const hasText =
    typeof content === "string"
      ? content !== ""
      : Array.isArray(content) && content.length > 0;
  const hasTools =
    (message?.tool_calls?.length ?? 0) > 0 ||
    (message?.tool_call_chunks?.length ?? 0) > 0;
  return hasText || hasTools;
}

/**
 * `ChatOpenAI` subclass that treats empty model responses (no content and no
 * tool calls) as retryable failures.
 *
 * The retry lives inside the model itself so it survives `createAgent` binding
 * tools to the model. `Runnable.withRetry()` cannot be used here: tool-binding
 * detects the `RunnableRetry` wrapper, unwraps `.bound`, and reconstructs a
 * plain `RunnableBinding` — discarding the retry override. `_generate` (the
 * non-streaming path) and `_streamResponseChunks` (the streaming path) are
 * mutually exclusive within a single `_generateUncached` call, so retrying in
 * both cannot double up.
 */
class SafeChatOpenAI extends ChatOpenAI {
  /** Non-streaming path (e.g. summarization without a streaming handler). */
  async _generate(messages: any, options: any, runManager?: any): Promise<any> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const result = await super._generate(messages, options, runManager);
        if (result.generations?.some((g: any) => hasOutput(g.message))) {
          return result;
        }
        lastError = new Error("Empty model response");
      } catch (error) {
        // Never retry an aborted request.
        if (options?.signal?.aborted) throw error;
        lastError = error;
        // Back off before retrying a thrown error; empty responses retry instantly.
        if (attempt < MAX_ATTEMPTS) await sleep(2 ** (attempt - 1) * 500);
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error("Model invocation failed");
  }

  /** Streaming path — the production path used via `streamEvents`. */
  async *_streamResponseChunks(
    messages: any,
    options: any,
    runManager?: any,
  ): AsyncGenerator<any, void, unknown> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      let produced = false;
      try {
        for await (const chunk of super._streamResponseChunks(
          messages,
          options,
          runManager,
        )) {
          if (hasOutput(chunk.message)) produced = true;
          yield chunk;
        }
      } catch (error) {
        // Never retry once real output has been streamed — a fresh attempt
        // would duplicate content already emitted to the consumer. Never
        // retry an aborted request either.
        if (produced || options?.signal?.aborted) throw error;
        lastError = error;
        if (attempt < MAX_ATTEMPTS) await sleep(2 ** (attempt - 1) * 500);
        continue;
      }
      if (produced) return;
      lastError = new Error("Empty model response");
    }
    throw lastError instanceof Error
      ? lastError
      : new Error("Model invocation failed");
  }
}

type LlmConfig = AgentModelConfig | AgentCompactionConfig;

export function createLlm(
  ctx: AppContext,
  agent_config: LlmConfig,
  chat_id: string,
  user_id: string,
  session_id: string,
) {
  const primary_config = agent_config.models.at(0);
  if (!primary_config) {
    throw new MockApiException({
      public_message: "Primary model config not found for agent.",
      status_code: HttpStatusCode.INTERNAL_SERVER_ERROR,
    });
  }

  return createChatModel(
    ctx,
    primary_config,
    chat_id,
    user_id,
    session_id,
    agent_config.reasoning,
  );
}

export function createFallbackMiddleware(
  ctx: AppContext,
  agent_config: LlmConfig,
  chat_id: string,
  user_id: string,
  session_id: string,
) {
  const fallback_models = agent_config.models
    .slice(1)
    .map((config) =>
      createChatModel(
        ctx,
        config,
        chat_id,
        user_id,
        session_id,
        agent_config.reasoning,
      ),
    );

  if (fallback_models.length === 0) return undefined;

  return modelFallbackMiddleware(...fallback_models);
}

function createChatModel(
  ctx: AppContext,
  model_config: LlmConfig["models"][number],
  chat_id: string,
  user_id: string,
  session_id: string,
  reasoning?: LlmConfig["reasoning"],
) {
  const portkey_config = createHeaders({
    apiKey: ctx.env.PORTKEY_API_KEY,
    metadata: {
      _env: ctx.env.ENV,
      _user: user_id,
      _chat: chat_id,
    },
  });

  return new SafeChatOpenAI({
    apiKey: "dummy",
    model: model_config.model,
    temperature: model_config.temperature,
    maxTokens: model_config.max_tokens,
    modelKwargs: {
      ...(reasoning ? { reasoning, include_reasoning: true } : {}),
      session_id,
    },
    configuration: {
      baseURL: "https://api.portkey.ai/v1",
      defaultHeaders: {
        ...portkey_config,
        "x-session-id": session_id,
      },
    },
  });
}
