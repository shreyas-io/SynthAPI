import type { AgentConfigEt } from "../../agent_config";

type AgentConfigInput = Omit<AgentConfigEt, "id" | "created_at" | "updated_at">;
type ColumnKeys = Extract<keyof AgentConfigEt, string>;

export interface IAgentConfigsRepository {
  count: (params: {
    filters: {
      ids?: string[];
      keys?: string[];
      enabled?: boolean;
    };
  }) => Promise<number>;
  create: (input: AgentConfigInput) => Promise<string>;
  list: {
    (params: {
      filters: {
        ids?: string[];
        keys?: string[];
        enabled?: boolean;
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
        ids?: string[];
        keys?: string[];
        enabled?: boolean;
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
