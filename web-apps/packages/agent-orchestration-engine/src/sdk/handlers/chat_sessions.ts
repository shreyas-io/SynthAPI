import type { AppContext } from "../..";
import { AgentOrchestrationException } from "../../exceptions/exception";
import { ChatSessionsRepository } from "../../infrastructure/kysely/repositories/chat_sessions";
import {
  createChatSessionDto,
  listChatSessionsFilterDto,
  listChatSessionsPaginationDto,
  listChatSessionsSortDto,
  updateChatSessionDto,
} from "../dto/chat_sessions";

export function ChatSessions(ctx: AppContext) {
  const chat_sessions = ChatSessionsRepository(ctx.database);

  return {
    createChatSession: (data: unknown) => {
      const { data: v, success, error } = createChatSessionDto.safeParse(data);

      if (!success)
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(error.issues),
        });

      return chat_sessions.create(v);
    },
    listChatSessions: (filters: unknown, pagination: unknown, sort: unknown) => {
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

      return chat_sessions.list({ filters: f, pagination: p, sort: s });
    },
    countChatSessions: (filters: unknown) => {
      const { data: f, success, error } =
        listChatSessionsFilterDto.safeParse(filters);

      if (!success)
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(error.issues),
        });

      return chat_sessions.count({ filters: f });
    },
    updateChatSession: (id: string, data: unknown) => {
      const { data: v, success, error } = updateChatSessionDto.safeParse(data);

      if (!success)
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(error.issues),
        });

      return chat_sessions.update(id, v);
    },
    deleteChatSession: (id: string) => chat_sessions.delete(id),
  };
}
