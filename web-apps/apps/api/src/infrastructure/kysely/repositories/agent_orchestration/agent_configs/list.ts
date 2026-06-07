import type { AgentConfigEt } from "../../../../../domain/entities/agent_orchestration/agent_config";
import type { IAgentConfigsRepository } from "../../../../../domain/interfaces/repositories/agent_orchestration/agent_configs";
import type { DatabaseClient } from "../../../index";

type AgentConfigFilters = {
  ids?: string[] | undefined;
  keys?: string[] | undefined;
  enabled?: boolean | undefined;
};

type AgentConfigPagination = {
  limit: number;
  offset: number;
};

type AgentConfigSort = {
  by: "name" | "created_at";
  order: "asc" | "desc";
};

type ColumnKeys = Extract<keyof AgentConfigEt, string>;

export const list = (client: DatabaseClient): IAgentConfigsRepository["list"] => {
  async function listAgentConfigs(params: {
    filters: AgentConfigFilters;
    pagination?: AgentConfigPagination;
    sort?: AgentConfigSort;
  }): Promise<AgentConfigEt[]>;
  async function listAgentConfigs<C extends readonly ColumnKeys[]>(params: {
    filters: AgentConfigFilters;
    columns: C;
    pagination?: AgentConfigPagination;
    sort?: AgentConfigSort;
  }): Promise<Pick<AgentConfigEt, C[number]>[]>;
  async function listAgentConfigs<C extends readonly ColumnKeys[]>({
    filters,
    columns,
    pagination,
    sort,
  }: {
    filters: AgentConfigFilters;
    columns?: C;
    pagination?: AgentConfigPagination;
    sort?: AgentConfigSort;
  }): Promise<AgentConfigEt[] | Pick<AgentConfigEt, C[number]>[]> {
    if (!filters.ids?.length && !filters.keys?.length && filters.enabled === undefined && !pagination)
      return [];

    let query = client.db.selectFrom("agent_configs");

    if (columns?.length) {
      query = query.select(columns);
    } else {
      query = query.selectAll();
    }

    if (filters.ids?.length) {
      query = query.where("id", "in", filters.ids);
    }

    if (filters.keys?.length) {
      query = query.where("key", "in", filters.keys);
    }

    if (filters.enabled !== undefined) {
      query = query.where("enabled", "=", filters.enabled);
    }

    if (sort?.by) {
      query = query.orderBy(sort.by, sort.order);
    }

    if (pagination?.limit) {
      query = query.limit(pagination.limit).offset(pagination.offset);
    }

    const rows = await query.execute();

    return rows as AgentConfigEt[] | Pick<AgentConfigEt, ColumnKeys>[];
  }

  return listAgentConfigs;
};
