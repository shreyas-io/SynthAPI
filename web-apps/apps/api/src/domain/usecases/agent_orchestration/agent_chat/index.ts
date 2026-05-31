import type { AppContext } from "../../../../application/agent_orchestration/context";
import type { LLMConfig } from "../../../entities/agent_orchestration/generation";
import type { ChatTurnUserInput } from "../../../entities/agent_orchestration/chat_session_turn";
import type {
  ChatTurnEventPayload,
  ChatTurnEventType,
} from "../../../entities/agent_orchestration/chat_turn_event";
import { ChatSessionsRepository } from "../../../../infrastructure/kysely/repositories/agent_orchestration/chat_sessions";
import { ChatSessionTurnsRepository } from "../../../../infrastructure/kysely/repositories/agent_orchestration/chat_session_turns";
import { ChatTurnEventsRepository } from "../../../../infrastructure/kysely/repositories/agent_orchestration/chat_turn_events";
import { AgentConfigsRepository } from "../../../../infrastructure/kysely/repositories/agent_orchestration/agent_configs";
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
  const chat_sessions_repo = ChatSessionsRepository(ctx.database);
  const chat_turns = ChatSessionTurnsRepository(ctx.database);
  const chat_events = ChatTurnEventsRepository(ctx.database);
  const agent_configs = AgentConfigsRepository(ctx.database);
  const llm = streamText(ctx);
  const eventBus = ctx.eventBus;
  const toolRegistry = AgentToolRegistry();

  const createAndPublishEvent = async (input: {
    chat_turn_id: string;
    sequence: number;
    event_type: ChatTurnEventType;
    payload: ChatTurnEventPayload;
  }) => {
    await chat_events.create(input);
    eventBus.publish(input.chat_turn_id, input.payload);
  };

  const getAgentConfig = async (id: string) => {
    const configs = await agent_configs.list({ filters: { ids: [id] } });
    const config = configs[0];
    if (!config) {
      throw new AgentOrchestrationException({
        public_message: "Agent config not found.",
        status_code: HttpStatusCode.NOT_FOUND,
      });
    }
    return config;
  };

  return {
    createChatTurn: (
      chat_session_id: string,
      input: {
        user_input: ChatTurnUserInput;
        mode: "execution" | "planning";
      },
    ) => createChatTurn(ctx, chat_session_id, input),
    executeChatTurn: async (
      chat_session_id: string,
      turn_id: string,
      workspace?: ToolWorkspaceContext,
    ): Promise<void> => {
      const count = await chat_sessions_repo.count({
        filters: { ids: [chat_session_id] },
      });
      if (count === 0) {
        throw new AgentOrchestrationException({
          public_message: "Chat session not found.",
          status_code: HttpStatusCode.NOT_FOUND,
        });
      }

      const turns = await chat_turns.list({
        filters: { ids: [turn_id], chat_session_ids: [chat_session_id] },
        columns: ["status", "chat_session_id", "mode", "user_input"],
      });
      const turn = turns.at(0);

      if (!turn) {
        throw new AgentOrchestrationException({
          public_message: "Chat turn not found.",
          status_code: HttpStatusCode.NOT_FOUND,
        });
      }

      if (turn.status === "completed") {
        return;
      }

      const session = await chat_sessions_repo.list({
        filters: { ids: [turn.chat_session_id] },
      });
      const chatSession = session.at(0);
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

      const existingEvents = await chat_events.list({
        filters: { chat_turn_ids: [turn_id] },
        sort: { by: "sequence", order: "asc" },
      });
      let sequence =
        existingEvents.length > 0
          ? Math.max(...existingEvents.map((e) => e.sequence)) + 1
          : 1;

      const userText = turn.user_input
        .filter(
          (
            item,
          ): item is { type: "text"; source: { type: "text"; text: string } } =>
            item.type === "text",
        )
        .map((item) => item.source.text)
        .join("\n");

      let currentRequest = {
        config: {
          ...llmConfig,
          input_messages: [
            ...(llmConfigWithTools.input_messages || []),
            {
              role: "user" as const,
              content: { type: "text" as const, text: userText },
            },
          ],
          custom_tools: llmConfigWithTools.custom_tools,
        },
        raw: null,
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

        const toolCalls = await (result as any).toolCalls;

        if (!toolCalls || toolCalls.length === 0) {
          break;
        }

        const toolResponses = [];

        for (const toolCall of toolCalls) {
          const toolName = toolCall.toolName as string;
          const toolArgs = toolCall.args as Record<string, unknown>;
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

        currentRequest = {
          config: {
            ...currentRequest.config,
            input_messages: [
              ...(currentRequest.config.input_messages || []),
              {
                role: "tool_call_response" as const,
                content: toolResponses,
              },
            ],
          },
          raw: null,
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

      await chat_turns.update(turn_id, {
        conversation_context: null,
        status: "completed",
      });
    },
  };
};
