import { sql } from "kysely";

import type { IMockApiResponsesRepository } from "../../../../domain/entities/interfaces/repositories/mock_api_responses";
import type { DatabaseClient } from "../../index";

type MockApiResponseFilters = {
  ids?: string[];
  mock_api_ids?: string[];
  name?: string;
};

export const count =
  (client: DatabaseClient): IMockApiResponsesRepository["count"] =>
  async ({ filters }: { filters: MockApiResponseFilters }): Promise<number> => {
    if (
      !filters.ids?.length &&
      !filters.mock_api_ids?.length &&
      !filters.name
    )
      return 0;

    let query = client.db
      .selectFrom("mock_api_responses")
      .select(sql<number>`count(*)::int`.as("count"));

    if (filters.ids?.length) {
      query = query.where("id", "in", filters.ids);
    }

    if (filters.mock_api_ids?.length) {
      query = query.where("mock_api_id", "in", filters.mock_api_ids);
    }

    if (filters.name) {
      query = query.where("name", "ilike", `%${filters.name}%`);
    }

    const row = await query.executeTakeFirstOrThrow();

    return row.count;
  };
