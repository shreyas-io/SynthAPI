import type { ChatSessionTurnEt } from "../../../../domain/entities/chat_session_turn";
import type { IChatSessionTurnsRepository } from "../../../../domain/entities/interfaces/repositories/chat_session_turns";
import type { DatabaseClient } from "../../index";

type ChatSessionTurnFilters = {
  ids?: string[];
  chat_session_ids?: string[];
  modes?: Array<ChatSessionTurnEt["mode"]>;
  statuses?: Array<ChatSessionTurnEt["status"]>;
};

type ChatSessionTurnPagination = {
  limit: number;
  offset: number;
};

type ChatSessionTurnSort = {
  by: "created_at";
  order: "asc" | "desc";
};

type ColumnKeys = Extract<keyof ChatSessionTurnEt, string>;

export const list = (
  client: DatabaseClient,
): IChatSessionTurnsRepository["list"] => {
  async function listChatSessionTurns(params: {
    filters: ChatSessionTurnFilters;
    pagination?: ChatSessionTurnPagination;
    sort?: ChatSessionTurnSort;
  }): Promise<ChatSessionTurnEt[]>;
  async function listChatSessionTurns<C extends readonly ColumnKeys[]>(params: {
    filters: ChatSessionTurnFilters;
    columns: C;
    pagination?: ChatSessionTurnPagination;
    sort?: ChatSessionTurnSort;
  }): Promise<Pick<ChatSessionTurnEt, C[number]>[]>;
  async function listChatSessionTurns<C extends readonly ColumnKeys[]>({
    filters,
    columns,
    pagination,
    sort,
  }: {
    filters: ChatSessionTurnFilters;
    columns?: C;
    pagination?: ChatSessionTurnPagination;
    sort?: ChatSessionTurnSort;
  }): Promise<ChatSessionTurnEt[] | Pick<ChatSessionTurnEt, C[number]>[]> {
    if (
      !filters.ids?.length &&
      !filters.chat_session_ids?.length &&
      !filters.modes?.length &&
      !filters.statuses?.length &&
      !pagination
    )
      return [];

    let query = client.db.selectFrom("chat_session_turns");

    if (columns?.length) {
      query = query.select(columns);
    } else {
      query = query.selectAll();
    }

    if (filters.ids?.length) {
      query = query.where("id", "in", filters.ids);
    }

    if (filters.chat_session_ids?.length) {
      query = query.where("chat_session_id", "in", filters.chat_session_ids);
    }

    if (filters.modes?.length) {
      query = query.where("mode", "in", filters.modes);
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

    return rows as ChatSessionTurnEt[] | Pick<ChatSessionTurnEt, ColumnKeys>[];
  }

  return listChatSessionTurns;
};
