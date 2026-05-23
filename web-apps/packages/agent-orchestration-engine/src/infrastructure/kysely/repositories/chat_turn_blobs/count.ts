import { sql } from "kysely";

import type { ChatTurnBlobMimeType } from "../../../../domain/entities/chat_turn_blob";
import type { IChatTurnBlobsRepository } from "../../../../domain/entities/interfaces/repositories/chat_turn_blobs";
import type { DatabaseClient } from "../../index";

type ChatTurnBlobFilters = {
  ids?: string[];
  mime_types?: ChatTurnBlobMimeType[];
};

export const count =
  (client: DatabaseClient): IChatTurnBlobsRepository["count"] =>
  async ({ filters }: { filters: ChatTurnBlobFilters }): Promise<number> => {
    if (!filters.ids?.length && !filters.mime_types?.length) return 0;

    let query = client.db
      .selectFrom("chat_turn_blobs")
      .select(sql<number>`count(*)::int`.as("count"));

    if (filters.ids?.length) {
      query = query.where("id", "in", filters.ids);
    }

    if (filters.mime_types?.length) {
      query = query.where("mime_type", "in", filters.mime_types);
    }

    const row = await query.executeTakeFirstOrThrow();

    return row.count;
  };
