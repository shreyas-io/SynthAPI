import { z } from "zod";
import type { AppContext } from "../../index.js";
import { ChatSessionsUsecase } from "../../domain/usecases/chat_sessions";
import { AgentOrchestrationException } from "../../exceptions/exception";
import {
  createChatSessionDto,
  listChatSessionsFilterDto,
  listChatSessionsPaginationDto,
  listChatSessionsSortDto,
  updateChatSessionDto,
} from "../dto/chat_sessions";

export function ChatSessions(ctx: AppContext) {
  const chat_sessions = ChatSessionsUsecase(ctx);

  return {
    createChatSession: (data: unknown) => {
      const { data: v, success, error } = createChatSessionDto.safeParse(data);

      if (!success)
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(error.issues),
        });

      return chat_sessions.createChatSession(v);
    },
    getChatSession: (id: string) => chat_sessions.getChatSession(id),
    listChatSessions: (
      filters: unknown,
      pagination: unknown,
      sort: unknown,
    ) => {
      const {
        data: f,
        success: s_0,
        error: e_0,
      } = listChatSessionsFilterDto.safeParse(filters);
      if (!s_0)
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(e_0.issues),
        });

      const {
        data: p,
        success: s_1,
        error: e_1,
      } = listChatSessionsPaginationDto.safeParse(pagination);
      if (!s_1)
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(e_1.issues),
        });

      const {
        data: s,
        success: s_2,
        error: e_2,
      } = listChatSessionsSortDto.safeParse(sort);
      if (!s_2)
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(e_2.issues),
        });

      return chat_sessions.getChatSessions(f, p, s);
    },
    countChatSessions: (filters: z.infer<typeof listChatSessionsFilterDto>) => {
      const {
        data: f,
        success,
        error,
      } = listChatSessionsFilterDto.safeParse(filters);

      if (!success)
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(error.issues),
        });

      return chat_sessions.countChatSessions(f);
    },
    updateChatSession: (id: string, data: unknown) => {
      const { data: v, success, error } = updateChatSessionDto.safeParse(data);

      if (!success)
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(error.issues),
        });

      return chat_sessions.updateChatSession(id, v);
    },
    deleteChatSession: (id: string) => chat_sessions.deleteChatSession(id),
  };
}
