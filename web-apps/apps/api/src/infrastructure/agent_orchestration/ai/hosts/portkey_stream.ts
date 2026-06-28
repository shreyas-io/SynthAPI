import { createOpenAI } from "@ai-sdk/openai";
import {
  streamText,
  type AsyncIterableStream,
  type ModelMessage,
  type StreamTextResult,
  type TextStreamPart,
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

function createStreamTextResult(
  ctx: AppContext,
  input: PortkeyStreamInput,
): StreamTextResult<any, any> {
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
}

function createAsyncIterableStream<T>(
  iterable: AsyncIterable<T>,
): AsyncIterableStream<T> {
  let iterator: AsyncIterator<T> | undefined;

  const stream = new ReadableStream<T>({
    async pull(controller) {
      try {
        iterator ??= iterable[Symbol.asyncIterator]();

        const { done, value } = await iterator.next();
        if (done) {
          controller.close();
          return;
        }

        controller.enqueue(value);
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel() {
      await iterator?.return?.();
    },
  }) as AsyncIterableStream<T>;

  stream[Symbol.asyncIterator] = function () {
    const reader = this.getReader();
    let finished = false;

    async function cleanup(cancelStream: boolean) {
      if (finished) {
        return;
      }

      finished = true;
      try {
        if (cancelStream) {
          await reader.cancel();
        }
      } finally {
        reader.releaseLock();
      }
    }

    return {
      async next() {
        if (finished) {
          return { done: true, value: undefined };
        }

        const { done, value } = await reader.read();
        if (done) {
          await cleanup(true);
          return { done: true, value: undefined };
        }

        return { done: false, value };
      },
      async return() {
        await cleanup(true);
        return { done: true, value: undefined };
      },
      async throw(error?: unknown) {
        await cleanup(true);
        throw error;
      },
      [Symbol.asyncIterator]() {
        return this;
      },
    };
  };

  return stream;
}

function withoutFreeSuffix(model: string): string {
  return model.endsWith(":free") ? model.slice(0, -":free".length) : model;
}

function isUserVisibleStreamPart(part: TextStreamPart<any>): boolean {
  return (
    part.type === "text-delta" ||
    part.type === "reasoning-delta" ||
    part.type === "tool-input-start" ||
    part.type === "tool-call" ||
    part.type === "tool-result"
  );
}

function withFreeModelFallback(
  ctx: AppContext,
  input: PortkeyStreamInput,
  primaryResult: StreamTextResult<any, any>,
): StreamTextResult<any, any> {
  let activeResult = primaryResult;
  let fallbackResult: StreamTextResult<any, any> | undefined;

  function getFallbackResult(): StreamTextResult<any, any> {
    if (!fallbackResult) {
      fallbackResult = createStreamTextResult(ctx, {
        ...input,
        model: withoutFreeSuffix(input.model),
      });
      activeResult = fallbackResult;
    }

    return fallbackResult;
  }

  async function* fullStreamWithFallback(): AsyncIterable<TextStreamPart<any>> {
    let yieldedVisiblePart = false;

    try {
      for await (const part of primaryResult.fullStream) {
        if (part.type === "error" && !yieldedVisiblePart) {
          const fallback = getFallbackResult();
          for await (const fallbackPart of fallback.fullStream) {
            yield fallbackPart;
          }
          return;
        }

        if (isUserVisibleStreamPart(part)) {
          yieldedVisiblePart = true;
        }

        yield part;
      }
    } catch (error) {
      if (yieldedVisiblePart) {
        throw error;
      }

      const fallback = getFallbackResult();
      for await (const part of fallback.fullStream) {
        yield part;
      }
    }
  }

  return new Proxy(primaryResult, {
    get(target, property, receiver) {
      if (property === "fullStream") {
        if (activeResult !== primaryResult) {
          return activeResult.fullStream;
        }

        return createAsyncIterableStream(fullStreamWithFallback());
      }

      if (property === "consumeStream") {
        return async (options?: Parameters<typeof target.consumeStream>[0]) => {
          try {
            for await (const _part of Reflect.get(
              receiver,
              "fullStream",
            ) as AsyncIterableStream<TextStreamPart<any>>) {
              // Consume the stream to completion.
            }
          } catch (error) {
            options?.onError?.(error);
          }
        };
      }

      const value = Reflect.get(activeResult, property, activeResult);
      return typeof value === "function" ? value.bind(activeResult) : value;
    },
  });
}

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

    try {
      const result = createStreamTextResult(ctx, input);
      if (input.model.endsWith(":free")) {
        return withFreeModelFallback(ctx, input, result);
      }

      return result;
    } catch (e) {
      if (input.model.endsWith(":free")) {
        return createStreamTextResult(ctx, {
          ...input,
          model: withoutFreeSuffix(input.model),
        });
      }

      throw e;
    }
  } catch (error) {
    throw new AgentOrchestrationException({
      public_message: "Text streaming failed.",
      message: "Portkey text streaming request failed.",
      cause: error,
    });
  }
}
