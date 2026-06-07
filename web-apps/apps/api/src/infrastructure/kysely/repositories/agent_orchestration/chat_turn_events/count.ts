import { sql } from "kysely";

import type { ChatTurnEventType } from "../../../../../domain/entities/agent_orchestration/chat_turn_event";
import type { IChatTurnEventsRepository } from "../../../../../domain/interfaces/repositories/agent_orchestration/chat_turn_events";
import type { DatabaseClient } from "../../../index";

type ChatTurnEventFilters = {
  ids?: string[] | undefined;
  chat_turn_ids?: string[] | undefined;
  chat_session_ids?: string[] | undefined;
  event_types?: ChatTurnEventType[] | undefined;
};

export const count =
  (client: DatabaseClient): IChatTurnEventsRepository["count"] =>
  async ({ filters }: { filters: ChatTurnEventFilters }): Promise<number> => {
    if (!filters.ids?.length && !filters.chat_turn_ids?.length && !filters.chat_session_ids?.length && !filters.event_types?.length)
      return 0;

    let query = client.db
      .selectFrom("chat_turn_events")
      .select(sql<number>`count(*)::int`.as("count"));

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

    const row = await query.executeTakeFirstOrThrow();

    return row.count;
  };
