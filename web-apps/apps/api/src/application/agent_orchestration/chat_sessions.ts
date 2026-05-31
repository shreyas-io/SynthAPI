import { z } from "zod";

import { AgentOrchestrationException, HttpStatusCode } from "../../domain/exceptions/exception";
import { ChatSessionsUsecase } from "../../domain/usecases/agent_orchestration/chat_sessions";
import { AgentConfigsRepository } from "../../infrastructure/kysely/repositories/agent_orchestration/agent_configs";
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

  const agent_configs_repo = AgentConfigsRepository(ctx.database);

  const createChatSessionWithDefaultAgentConfig = async (data: {
    project_id: string;
    name: string;
    description?: string | null;
  }) => {
    const configs = await agent_configs_repo.list({
      filters: { keys: ["local-default"], enabled: true },
    });
    let agentConfigId: string;
    if (configs.length > 0) {
      agentConfigId = configs[0]!.id;
    } else {
      const fallback = await agent_configs_repo.list({
        filters: { enabled: true },
        sort: { by: "created_at", order: "asc" },
        pagination: { limit: 1, offset: 0 },
      });
      if (fallback.length === 0) {
        throw new AgentOrchestrationException({
          public_message: "No enabled agent configuration found. Please create one first.",
          status_code: HttpStatusCode.PRECONDITION_FAILED,
        });
      }
      agentConfigId = fallback[0]!.id;
    }

    return chat_sessions.createChatSession({
      agent_config_id: agentConfigId,
      project_id: data.project_id,
      name: data.name,
      description: data.description ?? null,
      status: "active",
    });
  };

  return {
    createChatSessionWithDefaultAgentConfig,
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
