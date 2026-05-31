import type { ChatSessionEt } from "../../../../../domain/entities/agent_orchestration/chat_session";
import type { IChatSessionsRepository } from "../../../../../domain/interfaces/repositories/agent_orchestration/chat_sessions";
import type { DatabaseClient } from "../../../index";

type ChatSessionFilters = {
  ids?: string[] | undefined;
  agent_config_ids?: string[] | undefined;
  name?: string | undefined;
  description?: string | undefined;
  statuses?: Array<ChatSessionEt["status"]> | undefined;
};

type ChatSessionPagination = {
  limit: number;
  offset: number;
};

type ChatSessionSort = {
  by: "name" | "created_at";
  order: "asc" | "desc";
};

type ColumnKeys = Extract<keyof ChatSessionEt, string>;

export const list = (client: DatabaseClient): IChatSessionsRepository["list"] => {
  async function listChatSessions(params: {
    filters: ChatSessionFilters;
    pagination?: ChatSessionPagination;
    sort?: ChatSessionSort;
  }): Promise<ChatSessionEt[]>;
  async function listChatSessions<C extends readonly ColumnKeys[]>(params: {
    filters: ChatSessionFilters;
    columns: C;
    pagination?: ChatSessionPagination;
    sort?: ChatSessionSort;
  }): Promise<Pick<ChatSessionEt, C[number]>[]>;
  async function listChatSessions<C extends readonly ColumnKeys[]>({
    filters,
    columns,
    pagination,
    sort,
  }: {
    filters: ChatSessionFilters;
    columns?: C;
    pagination?: ChatSessionPagination;
    sort?: ChatSessionSort;
  }): Promise<ChatSessionEt[] | Pick<ChatSessionEt, C[number]>[]> {
    if (
      !filters.ids?.length &&
      !filters.agent_config_ids?.length &&
      !filters.name &&
      !filters.description &&
      !filters.statuses?.length &&
      !pagination
    )
      return [];

    let query = client.db.selectFrom("chat_sessions");

    if (columns?.length) {
      query = query.select(columns);
    } else {
      query = query.selectAll();
    }

    if (filters.ids?.length) {
      query = query.where("id", "in", filters.ids);
    }

    if (filters.agent_config_ids?.length) {
      query = query.where("agent_config_id", "in", filters.agent_config_ids);
    }

    if (filters.name) {
      query = query.where("name", "ilike", `%${filters.name}%`);
    }

    if (filters.description) {
      query = query.where("description", "ilike", `%${filters.description}%`);
    }

    if (filters.statuses?.length) {
      query = query.where("status", "in", filters.statuses);
    }

    if (sort?.by) {
      query = query.orderBy(sort.by, sort.order);
    }

    if (pagination?.limit) {
      query = query.limit(pagination.limit).offset(pagination.offset);
    }

    const rows = await query.execute();

    return rows as ChatSessionEt[] | Pick<ChatSessionEt, ColumnKeys>[];
  }

  return listChatSessions;
};
