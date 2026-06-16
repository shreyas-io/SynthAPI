import type { AppContext } from "../../../../server";
import { logger } from "../../../../infrastructure/logger";
import { sql } from "kysely";
import { uuidv7 } from "uuidv7";
import type { LLMConfig } from "../../../entities/agent_orchestration/generation";
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
import { createChatTurn } from "./create";
import { AgentToolRegistry } from "../tools/registry";
import type { ToolKey } from "../../../entities/agent_orchestration/tool_keys";
import type { ToolWorkspaceContext } from "../tools/types";

export const AgentChatUsecase = (ctx: AppContext) => {
  const llm = streamText(ctx);
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
          planning_config: unknown;
          chat_config: unknown;
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
      .select(["status", "chat_session_id", "mode", "user_input"])
      .where("id", "=", turn_id)
      .where("chat_session_id", "=", chat_session_id)
      .executeTakeFirst()) as unknown as
      | Pick<
          ChatSessionTurnEt,
          "status" | "chat_session_id" | "mode" | "user_input"
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

      const llmConfig =
        turn.mode === "planning"
          ? (agentConfig.planning_config as unknown as LLMConfig)
          : (agentConfig.chat_config as unknown as LLMConfig);
      const llmConfigWithTools: LLMConfig = {
        ...llmConfig,
        custom_tools: toolRegistry.getAllToolDefinitions(),
      };

      const userText = turn.user_input
        .filter(
          (
            item,
          ): item is {
            type: "text";
            source: { type: "text"; text: string };
          } => item.type === "text",
        )
        .map((item) => item.source.text)
        .join("\n");

      const userMessage = { role: "user" as const, content: userText };
      const initialRawMessages = Array.isArray(initialRaw)
        ? [...initialRaw, userMessage]
        : [userMessage];

      let currentRequest = {
        config: {
          ...llmConfig,
          input_messages: [],
          custom_tools: llmConfigWithTools.custom_tools,
        },
        raw: initialRawMessages,
      };

      let iteration = 0;
      const maxIterations = 20;
      let fullText = "";

      while (iteration < maxIterations) {
        iteration++;
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
        conversation_context: currentRequest.raw
          ? {
              model_host: currentRequest.config.model_host,
              model_provider: currentRequest.config.model_provider,
              model_gateway: currentRequest.config.model_gateway,
              model_id: currentRequest.config.model_id,
              raw_context: currentRequest.raw,
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
        mode: "execution" | "planning";
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
