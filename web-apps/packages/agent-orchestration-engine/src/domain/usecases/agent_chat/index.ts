import type { AppContext } from "../../..";
import type { LLMConfig } from "../../entities/generation";
import type { ChatTurnUserInput } from "../../entities/chat_session_turn";
import type { ChatTurnEventPayload, ChatTurnEventType } from "../../entities/chat_turn_event";
import { ChatSessionsRepository } from "../../../infrastructure/kysely/repositories/chat_sessions";
import { ChatSessionTurnsRepository } from "../../../infrastructure/kysely/repositories/chat_session_turns";
import { ChatTurnEventsRepository } from "../../../infrastructure/kysely/repositories/chat_turn_events";
import { AgentConfigsRepository } from "../../../infrastructure/kysely/repositories/agent_configs";
import { streamText } from "../../../infrastructure/ai/stream";
import {
  AgentOrchestrationException,
  HttpStatusCode,
} from "../../../exceptions/exception";

type CreateChatTurnInput = {
  user_input: ChatTurnUserInput;
  mode: "execution" | "planning";
};

export const AgentChatUsecase = (ctx: AppContext) => {
  const chat_sessions_repo = ChatSessionsRepository(ctx.database);
  const chat_turns = ChatSessionTurnsRepository(ctx.database);
  const chat_events = ChatTurnEventsRepository(ctx.database);
  const agent_configs = AgentConfigsRepository(ctx.database);
  const llm = streamText(ctx);
  const eventBus = ctx.eventBus;

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

  const createAndPublishEvent = async (input: {
    chat_turn_id: string;
    sequence: number;
    event_type: ChatTurnEventType;
    payload: ChatTurnEventPayload;
  }) => {
    const eventId = await chat_events.create(input);
    const events = await chat_events.list({ filters: { ids: [eventId] } });
    const event = events[0];
    if (event && eventBus) {
      eventBus.publish(input.chat_turn_id, event);
    }
    return event;
  };

  return {
    createChatTurn: async (
      chat_session_id: string,
      input: CreateChatTurnInput,
    ): Promise<string> => {
      const count = await chat_sessions_repo.count({
        filters: { ids: [chat_session_id] },
      });
      if (count === 0) {
        throw new AgentOrchestrationException({
          public_message: "Chat session not found.",
          status_code: HttpStatusCode.NOT_FOUND,
        });
      }

      const turnId = await chat_turns.create({
        chat_session_id,
        mode: input.mode,
        user_input: input.user_input,
        conversation_context: null,
        status: "in_progress",
      });

      await createAndPublishEvent({
        chat_turn_id: turnId,
        sequence: 1,
        event_type: "user_input",
        payload: { type: "user_input", input: input.user_input },
      });

      return turnId;
    },

    executeChatTurn: async (chat_session_id: string, turn_id: string): Promise<void> => {
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
            ...(llmConfig.input_messages || []),
            {
              role: "user" as const,
              content: { type: "text" as const, text: userText },
            },
          ],
        },
        raw: null,
      };

      let iteration = 0;
      const maxIterations = 5;
      let fullText = "";

      while (iteration < maxIterations) {
        iteration++;
        const result = await llm.streamText(currentRequest);

        for await (const textDelta of result.textStream) {
          fullText += textDelta;

          await createAndPublishEvent({
            chat_turn_id: turn_id,
            sequence: sequence++,
            event_type: "assistant_delta",
            payload: { type: "assistant_delta", text: textDelta },
          });
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

          await createAndPublishEvent({
            chat_turn_id: turn_id,
            sequence: sequence++,
            event_type: "tool_call_request",
            payload: {
              type: "tool_call_request",
              input: {
                tool_use_id: toolCallId,
                label: toolName,
                content: JSON.stringify(toolArgs),
              },
            },
          });

          if (!ctx.toolExecutor) {
            throw new AgentOrchestrationException({
              public_message: "Tool executor not configured.",
            });
          }

          const toolCallback = (ctx.toolExecutor.tools as any)[toolName];
          if (!toolCallback) {
            throw new AgentOrchestrationException({
              public_message: `Tool '${toolName}' is not available.`,
            });
          }

          let toolResult: unknown;
          try {
            toolResult = await toolCallback(toolArgs);
          } catch (error) {
            toolResult = { error: String(error) };
          }

          await createAndPublishEvent({
            chat_turn_id: turn_id,
            sequence: sequence++,
            event_type: "tool_call_response",
            payload: {
              type: "tool_call_response",
              output: {
                tool_use_id: toolCallId,
                label: toolName,
                content: JSON.stringify(toolResult),
                status: "success",
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
        event_type: "assistant_message",
        payload: {
          type: "assistant_message",
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
