import { ChatOpenAI } from "@langchain/openai";
import { modelFallbackMiddleware } from "langchain";

class SafeChatOpenAI extends ChatOpenAI {
  async invoke(input: any, options?: any): Promise<any> {
    const res = await super.invoke(input, options);
    if (!res.content && (!res.additional_kwargs?.tool_calls || res.additional_kwargs.tool_calls.length === 0)) {
      throw new Error("Empty model response");
    }
    return res;
  }

  async *_streamResponseChunks(
    messages: any,
    options: any,
    runManager?: any
  ): AsyncGenerator<any, void, unknown> {
    let hasContent = false;
    const generator = super._streamResponseChunks(messages, options, runManager);
    for await (const chunk of generator) {
      if ((chunk.message.content && chunk.message.content !== "") || (chunk.message.additional_kwargs?.tool_calls && chunk.message.additional_kwargs.tool_calls.length > 0)) {
        hasContent = true;
      }
      yield chunk;
    }
    if (!hasContent) {
      throw new Error("Empty model response");
    }
  }
}
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

  const model = new SafeChatOpenAI({
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

  return model.withRetry({ stopAfterAttempt: 3 });
}
