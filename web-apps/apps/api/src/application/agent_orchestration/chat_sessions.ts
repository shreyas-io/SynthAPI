import { z } from "zod";

import { AgentOrchestrationException } from "../../domain/exceptions/exception";
import { ChatSessionsUsecase } from "../../domain/usecases/agent_orchestration/chat_sessions";
import type { AppContext } from "./context";
import {
  createChatSessionDto,
  listChatSessionsFilterDto,
  listChatSessionsPaginationDto,
  listChatSessionsSortDto,
  updateChatSessionDto,
} from "./validation/chat_sessions";

export function ChatSessionsApplication(ctx: AppContext) {
  const chat_sessions = ChatSessionsUsecase(ctx);

  return {
    createChatSession: (data: unknown) => {
      const { data: input, success, error } =
        createChatSessionDto.safeParse(data);

      if (!success) {
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(error.issues),
        });
      }

      return chat_sessions.createChatSession(input);
    },
    getChatSession: (id: string) => chat_sessions.getChatSession(id),
    listChatSessions: (
      filters: unknown,
      pagination: unknown,
      sort: unknown,
    ) => {
      const {
        data: parsed_filters,
        success: filters_success,
        error: filters_error,
      } = listChatSessionsFilterDto.safeParse(filters);
      if (!filters_success) {
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(filters_error.issues),
        });
      }

      const {
        data: parsed_pagination,
        success: pagination_success,
        error: pagination_error,
      } = listChatSessionsPaginationDto.safeParse(pagination);
      if (!pagination_success) {
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(pagination_error.issues),
        });
      }

      const {
        data: parsed_sort,
        success: sort_success,
        error: sort_error,
      } = listChatSessionsSortDto.safeParse(sort);
      if (!sort_success) {
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(sort_error.issues),
        });
      }

      return chat_sessions.getChatSessions(
        parsed_filters,
        parsed_pagination,
        parsed_sort,
      );
    },
    countChatSessions: (filters: z.infer<typeof listChatSessionsFilterDto>) => {
      const { data: parsed_filters, success, error } =
        listChatSessionsFilterDto.safeParse(filters);

      if (!success) {
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(error.issues),
        });
      }

      return chat_sessions.countChatSessions(parsed_filters);
    },
    updateChatSession: (id: string, data: unknown) => {
      const { data: input, success, error } =
        updateChatSessionDto.safeParse(data);

      if (!success) {
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(error.issues),
        });
      }

      return chat_sessions.updateChatSession(id, input);
    },
    deleteChatSession: (id: string) => chat_sessions.deleteChatSession(id),
  };
}
