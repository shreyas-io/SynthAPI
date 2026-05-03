import { sql } from "kysely";

import type { IMockApisRepository } from "../../../../domain/entities/interfaces/repositories/mock_apis";
import type { DatabaseClient } from "../../index";

type MockApiFilters = {
  ids?: string[];
  project_ids?: string[];
  method?: string;
  path?: string;
  name?: string;
  description?: string;
};

export const count =
  (client: DatabaseClient): IMockApisRepository["count"] =>
  async ({ filters }: { filters: MockApiFilters }): Promise<number> => {
    if (
      !filters.ids?.length &&
      !filters.project_ids?.length &&
      !filters.method &&
      !filters.path &&
      !filters.name &&
      !filters.description
    )
      return 0;

    let query = client.db
      .selectFrom("mock_apis")
      .select(sql<number>`count(*)::int`.as("count"));

    if (filters.ids?.length) {
      query = query.where("id", "in", filters.ids);
    }

    if (filters.project_ids?.length) {
      query = query.where("project_id", "in", filters.project_ids);
    }

    if (filters.method) {
      query = query.where("method", "=", filters.method);
    }

    if (filters.path) {
      query = query.where("path", "ilike", `%${filters.path}%`);
    }

    if (filters.name) {
      query = query.where("name", "ilike", `%${filters.name}%`);
    }

    if (filters.description) {
      query = query.where("description", "ilike", `%${filters.description}%`);
    }

    const row = await query.executeTakeFirstOrThrow();

    return row.count;
  };
