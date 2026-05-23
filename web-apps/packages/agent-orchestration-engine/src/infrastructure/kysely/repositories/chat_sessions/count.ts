import { sql } from "kysely";

import type { ChatSessionEt } from "../../../../domain/entities/chat_session";
import type { IChatSessionsRepository } from "../../../../domain/entities/interfaces/repositories/chat_sessions";
import type { DatabaseClient } from "../../index";

type ChatSessionFilters = {
  ids?: string[];
  agent_config_ids?: string[];
  name?: string;
  description?: string;
  statuses?: Array<ChatSessionEt["status"]>;
};

export const count =
  (client: DatabaseClient): IChatSessionsRepository["count"] =>
  async ({ filters }: { filters: ChatSessionFilters }): Promise<number> => {
    if (
      !filters.ids?.length &&
      !filters.agent_config_ids?.length &&
      !filters.name &&
      !filters.description &&
      !filters.statuses?.length
    )
      return 0;

    let query = client.db
      .selectFrom("chat_sessions")
      .select(sql<number>`count(*)::int`.as("count"));

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

    const row = await query.executeTakeFirstOrThrow();

    return row.count;
  };
