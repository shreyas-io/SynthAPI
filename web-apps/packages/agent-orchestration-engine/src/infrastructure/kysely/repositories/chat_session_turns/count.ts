import { sql } from "kysely";

import type { ChatSessionTurnEt } from "../../../../domain/entities/chat_session_turn";
import type { IChatSessionTurnsRepository } from "../../../../domain/entities/interfaces/repositories/chat_session_turns";
import type { DatabaseClient } from "../../index";

type ChatSessionTurnFilters = {
  ids?: string[];
  chat_session_ids?: string[];
  modes?: Array<ChatSessionTurnEt["mode"]>;
  statuses?: Array<ChatSessionTurnEt["status"]>;
};

export const count =
  (client: DatabaseClient): IChatSessionTurnsRepository["count"] =>
  async ({ filters }: { filters: ChatSessionTurnFilters }): Promise<number> => {
    if (
      !filters.ids?.length &&
      !filters.chat_session_ids?.length &&
      !filters.modes?.length &&
      !filters.statuses?.length
    )
      return 0;

    let query = client.db
      .selectFrom("chat_session_turns")
      .select(sql<number>`count(*)::int`.as("count"));

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

    const row = await query.executeTakeFirstOrThrow();

    return row.count;
  };
