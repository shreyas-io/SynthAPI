import type { AppContext } from "../..";
import { AgentOrchestrationException } from "../../exceptions/exception";
import { ChatSessionTurnsRepository } from "../../infrastructure/kysely/repositories/chat_session_turns";
import {
  createChatSessionTurnDto,
  listChatSessionTurnsFilterDto,
  listChatSessionTurnsPaginationDto,
  listChatSessionTurnsSortDto,
  updateChatSessionTurnDto,
} from "../dto/chat_session_turns";

export function ChatSessionTurns(ctx: AppContext) {
  const chat_session_turns = ChatSessionTurnsRepository(ctx.database);

  return {
    createChatSessionTurn: (data: unknown) => {
      const { data: v, success, error } =
        createChatSessionTurnDto.safeParse(data);

      if (!success)
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(error.issues),
        });

      return chat_session_turns.create(v);
    },
    listChatSessionTurns: (
      filters: unknown,
      pagination: unknown,
      sort: unknown,
    ) => {
      const {
        data: f,
        success: s_0,
        error: e_0,
      } = listChatSessionTurnsFilterDto.safeParse(filters);
      if (!s_0)
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(e_0.issues),
        });

      const {
        data: p,
        success: s_1,
        error: e_1,
      } = listChatSessionTurnsPaginationDto.safeParse(pagination);
      if (!s_1)
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(e_1.issues),
        });

      const {
        data: s,
        success: s_2,
        error: e_2,
      } = listChatSessionTurnsSortDto.safeParse(sort);
      if (!s_2)
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(e_2.issues),
        });

      return chat_session_turns.list({ filters: f, pagination: p, sort: s });
    },
    countChatSessionTurns: (filters: unknown) => {
      const { data: f, success, error } =
        listChatSessionTurnsFilterDto.safeParse(filters);

      if (!success)
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(error.issues),
        });

      return chat_session_turns.count({ filters: f });
    },
    updateChatSessionTurn: (id: string, data: unknown) => {
      const { data: v, success, error } =
        updateChatSessionTurnDto.safeParse(data);

      if (!success)
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(error.issues),
        });

      return chat_session_turns.update(id, v);
    },
    deleteChatSessionTurn: (id: string) => chat_session_turns.delete(id),
  };
}
