import type { AgentConfigEt } from "../../../entities/agent_orchestration/agent_config";

type AgentConfigInput = Omit<AgentConfigEt, "id" | "created_at" | "updated_at">;
type ColumnKeys = Extract<keyof AgentConfigEt, string>;

export interface IAgentConfigsRepository {
  count: (params: {
    filters: {
      ids?: string[] | undefined;
      keys?: string[] | undefined;
      enabled?: boolean | undefined;
    };
  }) => Promise<number>;
  create: (input: AgentConfigInput, id?: string) => Promise<string>;
  list: {
    (params: {
      filters: {
        ids?: string[] | undefined;
        keys?: string[] | undefined;
        enabled?: boolean | undefined;
      };
      pagination?: {
        limit: number;
        offset: number;
      };
      sort?: {
        by: "name" | "created_at";
        order: "asc" | "desc";
      };
    }): Promise<AgentConfigEt[]>;
    <C extends readonly ColumnKeys[]>(params: {
      filters: {
        ids?: string[] | undefined;
        keys?: string[] | undefined;
        enabled?: boolean | undefined;
      };
      columns: C;
      pagination?: {
        limit: number;
        offset: number;
      };
      sort?: {
        by: "name" | "created_at";
        order: "asc" | "desc";
      };
    }): Promise<Pick<AgentConfigEt, C[number]>[]>;
  };
  update: (id: string, input: AgentConfigInput) => Promise<void>;
  delete: (id: string) => Promise<void>;
}
