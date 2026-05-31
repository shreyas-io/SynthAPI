import { sql } from "kysely";

import type { IAgentConfigsRepository } from "../../../../../domain/interfaces/repositories/agent_orchestration/agent_configs";
import type { DatabaseClient } from "../../../index";

type AgentConfigFilters = {
  ids?: string[] | undefined;
  keys?: string[] | undefined;
  enabled?: boolean | undefined;
};

export const count =
  (client: DatabaseClient): IAgentConfigsRepository["count"] =>
  async ({ filters }: { filters: AgentConfigFilters }): Promise<number> => {
    if (!filters.ids?.length && !filters.keys?.length && filters.enabled === undefined)
      return 0;

    let query = client.db
      .selectFrom("agent_configs")
      .select(sql<number>`count(*)::int`.as("count"));

    if (filters.ids?.length) {
      query = query.where("id", "in", filters.ids);
    }

    if (filters.keys?.length) {
      query = query.where("key", "in", filters.keys);
    }

    if (filters.enabled !== undefined) {
      query = query.where("enabled", "=", filters.enabled);
    }

    const row = await query.executeTakeFirstOrThrow();

    return row.count;
  };
