import type { AppContext } from "../../..";
import {
  AgentOrchestrationException,
  HttpStatusCode,
} from "../../../exceptions/exception";
import { ChatSessionsRepository } from "../../../infrastructure/kysely/repositories/chat_sessions";
import type { ChatSessionEt } from "../../entities/chat_session";

type ChatSessionInput = Pick<
  ChatSessionEt,
  "agent_config_id" | "name" | "description" | "status"
>;
type ChatSessionUpdateInput = Pick<
  ChatSessionEt,
  "name" | "description" | "status"
>;
type ChatSessionFilters = {
  ids?: string[];
  agent_config_ids?: string[];
  name?: string;
  description?: string;
  statuses?: Array<ChatSessionEt["status"]>;
};
type ChatSessionPagination = {
  limit: number;
  offset: number;
};
type ChatSessionSort = {
  by: "name" | "created_at";
  order: "asc" | "desc";
};

export const ChatSessionsUsecase = (ctx: AppContext) => {
  const chat_sessions_repository = ChatSessionsRepository(ctx.database);

  const getChatSession = async (id: string): Promise<ChatSessionEt> => {
    const chat_sessions = await chat_sessions_repository.list({
      filters: { ids: [id] },
    });
    const chat_session = chat_sessions.at(0);

    if (!chat_session) {
      throw new AgentOrchestrationException({
        public_message: "Chat session not found.",
        status_code: HttpStatusCode.NOT_FOUND,
      });
    }

    return chat_session;
  };

  return {
    createChatSession: async (
      input: ChatSessionInput,
    ): Promise<ChatSessionEt> => {
      const id = await chat_sessions_repository.create(input);

      return getChatSession(id);
    },
    getChatSession,
    getChatSessions: async (
      filters: ChatSessionFilters,
      pagination: ChatSessionPagination,
      sort: ChatSessionSort,
    ) => {
      const [total, records] = await Promise.all([
        chat_sessions_repository.count({ filters }),
        chat_sessions_repository.list({
          filters,
          pagination,
          sort,
        }),
      ]);

      return { total, records };
    },
    countChatSessions(filters: ChatSessionFilters): Promise<number> {
      return chat_sessions_repository.count({ filters });
    },
    updateChatSession(
      id: string,
      input: ChatSessionUpdateInput,
    ): Promise<void> {
      return chat_sessions_repository.update(id, input);
    },
    deleteChatSession(id: string): Promise<void> {
      return chat_sessions_repository.delete(id);
    },
  };
};
