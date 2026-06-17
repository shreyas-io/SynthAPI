import type { AppContext } from "../../../../server";
import { logger } from "../../../../infrastructure/logger";
import { sql } from "kysely";
import { uuidv7 } from "uuidv7";
import type { LLMConfig } from "../../../entities/agent_orchestration/generation";
import type { FilePart, TextPart, UserModelMessage } from "ai";
import type {
  ChatSessionTurnEt,
  ChatTurnUserInput,
} from "../../../entities/agent_orchestration/chat_session_turn";
import type {
  ChatTurnEventPayload,
  ChatTurnEventType,
} from "../../../entities/agent_orchestration/chat_turn_event";
import { streamText } from "../../../../infrastructure/agent_orchestration/ai/stream";
import {
  AgentOrchestrationException,
  HttpStatusCode,
} from "../../../exceptions/exception";
import { generateText } from "../../../../infrastructure/agent_orchestration/ai/generate";
import { createChatTurn } from "./create";
import { AgentToolRegistry } from "../tools/registry";
import type { ToolKey } from "../../../entities/agent_orchestration/tool_keys";
import type { ToolWorkspaceContext } from "../tools/types";

export const AgentChatUsecase = (ctx: AppContext) => {
  const llm = streamText(ctx);
  const textGenerator = generateText(ctx);
  const eventBus = ctx.eventBus;
  const toolRegistry = AgentToolRegistry();
  const runningTurns = new Set<string>();

  const createAndPublishEvent = async (input: {
    chat_turn_id: string;
    sequence: number;
    event_type: ChatTurnEventType;
    payload: ChatTurnEventPayload;
  }) => {
    await ctx.db
      .insertInto("chat_turn_events")
      .values({
        id: uuidv7(),
        chat_turn_id: input.chat_turn_id,
        sequence: input.sequence,
        event_type: input.event_type,
        payload: JSON.stringify(input.payload),
      })
      .executeTakeFirstOrThrow();
    eventBus.publish(input.chat_turn_id, input.payload);
  };

  const getNextSequence = async (chat_turn_id: string) => {
    const event = await ctx.db
      .selectFrom("chat_turn_events")
      .select(["sequence"])
      .where("chat_turn_id", "=", chat_turn_id)
      .orderBy("sequence", "desc")
      .limit(1)
      .offset(0)
      .executeTakeFirst();

    return (event?.sequence ?? 0) + 1;
  };

  const settleTurn = async (input: {
    chat_turn_id: string;
    sequence: number;
    status: "completed" | "failed";
    conversation_context: ChatSessionTurnEt["conversation_context"];
    error?: string;
  }) => {
    await ctx.db
      .updateTable("chat_session_turns")
      .set({
        conversation_context: input.conversation_context
          ? JSON.stringify(input.conversation_context)
          : null,
        status: input.status,
      })
      .where("id", "=", input.chat_turn_id)
      .execute();

    await createAndPublishEvent({
      chat_turn_id: input.chat_turn_id,
      sequence: input.sequence,
      event_type: "turn-settled",
      payload: {
        type: "turn-settled",
        status: input.status,
        ...(input.error ? { error: input.error } : {}),
      },
    });
  };

  const getAgentConfig = async (id: string) => {
    const config = (await ctx.db
      .selectFrom("agent_configs")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst()) as unknown as
      | {
          id: string;
          chat_config: unknown;
          compaction_config: unknown | null;
          compaction_threshold_tokens: number | null;
        }
      | undefined;
    if (!config) {
      throw new AgentOrchestrationException({
        public_message: "Agent config not found.",
        status_code: HttpStatusCode.NOT_FOUND,
      });
    }
    return config;
  };

  const estimateTokenCount = (input: unknown): number => {
    const serialized =
      typeof input === "string" ? input : JSON.stringify(input ?? "");
    return Math.ceil(serialized.length / 4);
  };

  const buildUserMessages = async (
    userInput: ChatTurnUserInput,
  ): Promise<{
    requestMessage: UserModelMessage;
    contextMessage: UserModelMessage;
  }> => {
    const requestParts: Array<TextPart | FilePart> = [];
    const contextParts: string[] = [];

    for (const item of userInput) {
      if (item.type === "text") {
        requestParts.push({ type: "text", text: item.source.text });
        contextParts.push(item.source.text);
        continue;
      }

      const blob = await ctx.db
        .selectFrom("chat_turn_blobs")
        .select(["id", "mime_type", "size_bytes", "content"])
        .where("id", "=", item.source.id)
        .executeTakeFirst();

      if (!blob) {
        throw new AgentOrchestrationException({
          public_message: `File '${item.source.id}' was not found.`,
          status_code: HttpStatusCode.NOT_FOUND,
        });
      }

      requestParts.push({
        type: "file",
        data: blob.content,
        mediaType: blob.mime_type,
        filename: blob.id,
      });
      contextParts.push(
        `[Attached file: ${blob.id}, MIME type: ${blob.mime_type}, Size: ${blob.size_bytes} bytes]`,
      );
    }

    const requestContent =
      requestParts.length === 1 && requestParts[0]?.type === "text"
        ? requestParts[0].text
        : requestParts;
    const contextContent = contextParts.filter(Boolean).join("\n\n");

    return {
      requestMessage: { role: "user", content: requestContent },
      contextMessage: { role: "user", content: contextContent },
    };
  };

  const compactConversation = async (input: {
    chat_turn_id: string;
    sequence: number;
    raw_messages: unknown[];
    compaction_config: LLMConfig;
  }): Promise<{ raw_messages: unknown[]; sequence: number }> => {
    let sequence = input.sequence;

    await createAndPublishEvent({
      chat_turn_id: input.chat_turn_id,
      sequence: sequence++,
      event_type: "compaction-started",
      payload: {
        type: "compaction-started",
      },
    });

    const compactedText = await textGenerator.generateText({
      config: {
        ...input.compaction_config,
        input_messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: JSON.stringify(input.raw_messages),
            },
          },
        ],
        custom_tools: [],
      },
      raw: null,
    });

    const compactedRawMessages = [
      {
        role: "user" as const,
        content: compactedText,
      },
    ];

    await createAndPublishEvent({
      chat_turn_id: input.chat_turn_id,
      sequence: sequence++,
      event_type: "chat-compacted",
      payload: {
        type: "chat-compacted",
      },
    });

    return { raw_messages: compactedRawMessages, sequence };
  };

  const executeChatTurnInternal = async (
    chat_session_id: string,
    turn_id: string,
    workspace?: ToolWorkspaceContext,
  ): Promise<void> => {
    const sessionCount = await ctx.db
      .selectFrom("chat_sessions")
      .select(sql<number>`count(*)::int`.as("count"))
      .where("id", "=", chat_session_id)
      .executeTakeFirstOrThrow();
    if (sessionCount.count === 0) {
      throw new AgentOrchestrationException({
        public_message: "Chat session not found.",
        status_code: HttpStatusCode.NOT_FOUND,
      });
    }

    const turn = (await ctx.db
      .selectFrom("chat_session_turns")
      .select(["status", "chat_session_id", "user_input"])
      .where("id", "=", turn_id)
      .where("chat_session_id", "=", chat_session_id)
      .executeTakeFirst()) as unknown as
      | Pick<
          ChatSessionTurnEt,
          "status" | "chat_session_id" | "user_input"
        >
      | undefined;

    if (!turn) {
      throw new AgentOrchestrationException({
        public_message: "Chat turn not found.",
        status_code: HttpStatusCode.NOT_FOUND,
      });
    }

    if (turn.status !== "in_progress") {
      return;
    }

    let sequence = await getNextSequence(turn_id);

    try {
      const previousTurn = (await ctx.db
        .selectFrom("chat_session_turns")
        .select(["conversation_context"])
        .where("chat_session_id", "=", chat_session_id)
        .where("status", "=", "completed")
        .orderBy("created_at", "desc")
        .limit(1)
        .offset(0)
        .executeTakeFirst()) as unknown as
        | Pick<ChatSessionTurnEt, "conversation_context">
        | undefined;
      const initialRaw =
        previousTurn?.conversation_context?.raw_context ?? null;

      const chatSession = await ctx.db
        .selectFrom("chat_sessions")
        .selectAll()
        .where("id", "=", turn.chat_session_id)
        .executeTakeFirst();
      if (!chatSession) {
        throw new AgentOrchestrationException({
          public_message: "Chat session not found.",
          status_code: HttpStatusCode.NOT_FOUND,
        });
      }

      const agentConfig = await getAgentConfig(chatSession.agent_config_id);

      const llmConfig = agentConfig.chat_config as unknown as LLMConfig;
      const compactionConfig =
        agentConfig.compaction_config as unknown as LLMConfig | null;
      const compactionThresholdTokens =
        agentConfig.compaction_threshold_tokens ?? 0;
      const llmConfigWithTools: LLMConfig = {
        ...llmConfig,
        custom_tools: toolRegistry.getAllToolDefinitions(),
      };

      const { requestMessage: userMessage, contextMessage: contextUserMessage } =
        await buildUserMessages(turn.user_input);
      const initialRawMessages = Array.isArray(initialRaw)
        ? [...initialRaw, userMessage]
        : [userMessage];
      const contextRawMessages = Array.isArray(initialRaw)
        ? [...initialRaw, contextUserMessage]
        : [contextUserMessage];

      let currentRequest = {
        config: {
          ...llmConfig,
          input_messages: [],
          custom_tools: llmConfigWithTools.custom_tools,
        },
        raw: initialRawMessages,
      };
      let currentContextRaw = contextRawMessages;

      let iteration = 0;
      const maxIterations = 20;
      let fullText = "";

      while (iteration < maxIterations) {
        iteration++;

        const contextRawMessages = Array.isArray(currentRequest.raw)
          ? currentRequest.raw
          : [];
        const tokenCount = estimateTokenCount(contextRawMessages);
        if (
          compactionConfig &&
          compactionThresholdTokens > 0 &&
          tokenCount > compactionThresholdTokens
        ) {
          const compacted = await compactConversation({
            chat_turn_id: turn_id,
            sequence,
            raw_messages: contextRawMessages,
            compaction_config: compactionConfig,
          });
          sequence = compacted.sequence;
          currentRequest = {
            ...currentRequest,
            raw: compacted.raw_messages,
          };
          currentContextRaw = compacted.raw_messages;
        }

        const result = await llm.streamText(currentRequest);
        for await (const event of result.fullStream) {
          switch (event.type) {
            case "text-delta":
              fullText += event.text;
              eventBus.publish(turn_id, {
                type: "assistant-delta",
                text: event.text,
              });
              continue;
            case "reasoning-delta":
              eventBus.publish(turn_id, {
                type: event.type,
                text: event.text,
              });
              continue;
            case "tool-input-start":
              eventBus.publish(turn_id, {
                type: "tool-input-start",
                text: event.toolName,
              });
              continue;
            case "tool-call":
              await createAndPublishEvent({
                chat_turn_id: turn_id,
                sequence: sequence++,
                event_type: "tool-input",
                payload: {
                  type: "tool-input",
                  input: {
                    tool_use_id: event.toolCallId,
                    label: event.toolName,
                    content: event.input as Record<string, any>,
                  },
                },
              });
              continue;
            case "tool-result":
              eventBus.publish(turn_id, {
                type: "tool-result",
                output: {
                  tool_use_id: event.toolCallId,
                  label: event.toolName,
                  content: event.output as Record<string, any>,
                  status: "success",
                },
              });
              continue;
            default:
              continue;
          }
        }

        const response = await result.response;
        const rawMessages = response.messages;
        const toolCalls = await result.toolCalls;

        if (!toolCalls || toolCalls.length === 0) {
          currentRequest = {
            ...currentRequest,
            raw: [...(currentRequest?.raw ?? []), ...(rawMessages ?? [])],
          };
          currentContextRaw = [...currentContextRaw, ...(rawMessages ?? [])];
          break;
        }

        const toolResponses = [];

        for (const toolCall of toolCalls) {
          const toolName = toolCall.toolName as string;
          const toolArgs = toolCall.input as Record<string, unknown>;
          const toolCallId = toolCall.toolCallId as string;

          if (!workspace) {
            throw new AgentOrchestrationException({
              public_message: "Tool workspace context not configured.",
            });
          }

          const tool = toolRegistry.getToolByName(toolName as ToolKey);
          if (!tool) {
            throw new AgentOrchestrationException({
              public_message: `Tool '${toolName}' is not available.`,
            });
          }

          let toolResult: unknown;
          let toolStatus: "success" | "failed" = "success";
          try {
            toolResult = await tool.execute(ctx, workspace, toolArgs);
          } catch (error) {
            toolStatus = "failed";
            toolResult = { error: String(error) };
          }

          await createAndPublishEvent({
            chat_turn_id: turn_id,
            sequence: sequence++,
            event_type: "tool-response",
            payload: {
              type: "tool-result",
              output: {
                tool_use_id: toolCallId,
                label: toolName,
                content: { result: toolResult },
                status: toolStatus,
              },
            },
          });

          toolResponses.push({
            tool_use_id: toolCallId,
            name: toolName,
            output: JSON.stringify(toolResult),
          });
        }

        const toolResultMessages = toolResponses.map((tr) => ({
          role: "tool" as const,
          content: [
            {
              type: "tool-result" as const,
              toolCallId: tr.tool_use_id,
              toolName: tr.name,
              output: { type: "text" as const, value: tr.output },
            },
          ],
        }));

        currentRequest = {
          config: {
            ...currentRequest.config,
            input_messages: [],
          },
          raw: [
            ...(currentRequest?.raw ?? []),
            ...rawMessages,
            ...toolResultMessages,
          ],
        };
        currentContextRaw = [
          ...currentContextRaw,
          ...rawMessages,
          ...toolResultMessages,
        ];
      }

      await createAndPublishEvent({
        chat_turn_id: turn_id,
        sequence: sequence++,
        event_type: "assistant-message",
        payload: {
          type: "assistant-message",
          content: [
            {
              type: "text",
              source: { type: "text", text: fullText },
            },
          ],
        },
      });

      await settleTurn({
        chat_turn_id: turn_id,
        sequence: sequence++,
        conversation_context: currentContextRaw
          ? {
              model_host: currentRequest.config.model_host,
              model_provider: currentRequest.config.model_provider,
              model_gateway: currentRequest.config.model_gateway,
              model_id: currentRequest.config.model_id,
              raw_context: currentContextRaw,
            }
          : null,
        status: "completed",
      });
    } catch (error) {
      await settleTurn({
        chat_turn_id: turn_id,
        sequence: await getNextSequence(turn_id),
        conversation_context: null,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  };

  return {
    createChatTurn: (
      chat_session_id: string,
      input: {
        user_input: ChatTurnUserInput;
      },
    ) => createChatTurn(ctx, chat_session_id, input),
    executeChatTurn: (
      chat_session_id: string,
      turn_id: string,
      workspace?: ToolWorkspaceContext,
    ): void => {
      if (runningTurns.has(turn_id)) {
        return;
      }

      runningTurns.add(turn_id);
      executeChatTurnInternal(chat_session_id, turn_id, workspace)
        .catch((error) => {
          logger.error(
            { err: error, chat_session_id, turn_id },
            "Chat turn execution failed",
          );
        })
        .finally(() => {
          runningTurns.delete(turn_id);
        });
    },
    getTurnStatus: async (turn_id: string) => {
      const turn = await ctx.db
        .selectFrom("chat_session_turns")
        .select(["id", "chat_session_id", "status"])
        .where("id", "=", turn_id)
        .executeTakeFirst();
      if (!turn) {
        throw new AgentOrchestrationException({
          public_message: "Turn not found.",
          status_code: HttpStatusCode.NOT_FOUND,
        });
      }
      return {
        id: turn.id,
        chat_session_id: turn.chat_session_id,
        status: turn.status,
      };
    },
    subscribeToTurn: (
      turn_id: string,
      handler: Parameters<AppContext["eventBus"]["subscribe"]>[1],
    ) => ctx.eventBus.subscribe(turn_id, handler),
  };
};
