import { sql } from "kysely";
import type { ChatTurnEventEt } from "../../../../../domain/entities/agent_orchestration/chat_turn_event";
import type { ChatTurnEventType } from "../../../../../domain/entities/agent_orchestration/chat_turn_event";
import type { IChatTurnEventsRepository } from "../../../../../domain/interfaces/repositories/agent_orchestration/chat_turn_events";
import type { DatabaseClient } from "../../../index";

type ChatTurnEventFilters = {
  ids?: string[] | undefined;
  chat_turn_ids?: string[] | undefined;
  chat_session_ids?: string[] | undefined;
  event_types?: ChatTurnEventType[] | undefined;
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
      !filters.chat_session_ids?.length &&
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

    if (filters.chat_session_ids?.length) {
      query = query
        .innerJoin("chat_session_turns", "chat_turn_events.chat_turn_id", "chat_session_turns.id")
        .where("chat_session_turns.chat_session_id", "in", filters.chat_session_ids);
    }

    if (filters.event_types?.length) {
      query = query.where("event_type", "in", filters.event_types);
    }

    if (sort?.by) {
      if (filters.chat_session_ids?.length) {
        query = query.orderBy(sql`chat_session_turns.created_at`, "asc");
      }
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
