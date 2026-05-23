import type { ChatTurnEventType } from "../../../../domain/entities/chat";
import type { ChatTurnEventEt } from "../../../../domain/entities/chat_turn_event";
import type { IChatTurnEventsRepository } from "../../../../domain/entities/interfaces/repositories/chat_turn_events";
import type { DatabaseClient } from "../../index";

type ChatTurnEventFilters = {
  ids?: string[];
  chat_turn_ids?: string[];
  event_types?: ChatTurnEventType[];
};

type ChatTurnEventPagination = {
  limit: number;
  offset: number;
};

type ChatTurnEventSort = {
  by: "sequence" | "created_at";
  order: "asc" | "desc";
};

type ColumnKeys = Extract<keyof ChatTurnEventEt, string>;

export const list = (
  client: DatabaseClient,
): IChatTurnEventsRepository["list"] => {
  async function listChatTurnEvents(params: {
    filters: ChatTurnEventFilters;
    pagination?: ChatTurnEventPagination;
    sort?: ChatTurnEventSort;
  }): Promise<ChatTurnEventEt[]>;
  async function listChatTurnEvents<C extends readonly ColumnKeys[]>(params: {
    filters: ChatTurnEventFilters;
    columns: C;
    pagination?: ChatTurnEventPagination;
    sort?: ChatTurnEventSort;
  }): Promise<Pick<ChatTurnEventEt, C[number]>[]>;
  async function listChatTurnEvents<C extends readonly ColumnKeys[]>({
    filters,
    columns,
    pagination,
    sort,
  }: {
    filters: ChatTurnEventFilters;
    columns?: C;
    pagination?: ChatTurnEventPagination;
    sort?: ChatTurnEventSort;
  }): Promise<ChatTurnEventEt[] | Pick<ChatTurnEventEt, C[number]>[]> {
    if (
      !filters.ids?.length &&
      !filters.chat_turn_ids?.length &&
      !filters.event_types?.length &&
      !pagination
    )
      return [];

    let query = client.db.selectFrom("chat_turn_events");

    if (columns?.length) {
      query = query.select(columns);
    } else {
      query = query.selectAll();
    }

    if (filters.ids?.length) {
      query = query.where("id", "in", filters.ids);
    }

    if (filters.chat_turn_ids?.length) {
      query = query.where("chat_turn_id", "in", filters.chat_turn_ids);
    }

    if (filters.event_types?.length) {
      query = query.where("event_type", "in", filters.event_types);
    }

    if (sort?.by) {
      query = query.orderBy(sort.by, sort.order);
    }

    if (pagination?.limit) {
      query = query.limit(pagination.limit).offset(pagination.offset);
    }

    const rows = await query.execute();

    return rows as ChatTurnEventEt[] | Pick<ChatTurnEventEt, ColumnKeys>[];
  }

  return listChatTurnEvents;
};
