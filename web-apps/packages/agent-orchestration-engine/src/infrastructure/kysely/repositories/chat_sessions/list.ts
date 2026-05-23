import type { ChatSessionEt } from "../../../../domain/entities/chat_session";
import type { IChatSessionsRepository } from "../../../../domain/entities/interfaces/repositories/chat_sessions";
import type { DatabaseClient } from "../../index";

type ChatSessionFilters = {
  ids?: string[];
  agent_config_ids?: string[];
  statuses?: Array<ChatSessionEt["status"]>;
};

type ChatSessionPagination = {
  limit: number;
  offset: number;
};

type ChatSessionSort = {
  by: "created_at";
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
    if (!filters.ids?.length && !filters.agent_config_ids?.length && !filters.statuses?.length && !pagination)
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
