import { ChatOpenAI } from "@langchain/openai";
import { modelFallbackMiddleware } from "langchain";
import { AgentConfig } from "../../domain/configs/agent-config/config";
import {
  HttpStatusCode,
  MockApiException,
} from "../../domain/exceptions/exception";
import { AppContext } from "../../server";
import { createHeaders } from "portkey-ai";

type LlmConfig =
  | (typeof AgentConfig)["agent"]
  | (typeof AgentConfig)["compaction"];

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
  const fallback_models = agent_config.models.slice(1).map((config) =>
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

  return new ChatOpenAI({
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
