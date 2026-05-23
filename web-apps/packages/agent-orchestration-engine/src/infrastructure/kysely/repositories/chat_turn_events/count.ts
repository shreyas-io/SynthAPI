import { sql } from "kysely";

import type { ChatTurnEventType } from "../../../../domain/entities/chat";
import type { IChatTurnEventsRepository } from "../../../../domain/entities/interfaces/repositories/chat_turn_events";
import type { DatabaseClient } from "../../index";

type ChatTurnEventFilters = {
  ids?: string[];
  chat_turn_ids?: string[];
  event_types?: ChatTurnEventType[];
};

export const count =
  (client: DatabaseClient): IChatTurnEventsRepository["count"] =>
  async ({ filters }: { filters: ChatTurnEventFilters }): Promise<number> => {
    if (!filters.ids?.length && !filters.chat_turn_ids?.length && !filters.event_types?.length)
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

    if (filters.event_types?.length) {
      query = query.where("event_type", "in", filters.event_types);
    }

    const row = await query.executeTakeFirstOrThrow();

    return row.count;
  };
