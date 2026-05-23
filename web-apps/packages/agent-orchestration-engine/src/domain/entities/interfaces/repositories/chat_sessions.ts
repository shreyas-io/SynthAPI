import type { ChatSessionEt } from "../../chat_session";

type ChatSessionInput = Pick<ChatSessionEt, "agent_config_id" | "status">;
type ChatSessionStatus = ChatSessionEt["status"];
type ColumnKeys = Extract<keyof ChatSessionEt, string>;

export interface IChatSessionsRepository {
  count: (params: {
    filters: {
      ids?: string[];
      agent_config_ids?: string[];
      statuses?: ChatSessionStatus[];
    };
  }) => Promise<number>;
  create: (input: ChatSessionInput) => Promise<string>;
  list: {
    (params: {
      filters: {
        ids?: string[];
        agent_config_ids?: string[];
        statuses?: ChatSessionStatus[];
      };
      pagination?: {
        limit: number;
        offset: number;
      };
      sort?: {
        by: "created_at";
        order: "asc" | "desc";
      };
    }): Promise<ChatSessionEt[]>;
    <C extends readonly ColumnKeys[]>(params: {
      filters: {
        ids?: string[];
        agent_config_ids?: string[];
        statuses?: ChatSessionStatus[];
      };
      columns: C;
      pagination?: {
        limit: number;
        offset: number;
      };
      sort?: {
        by: "created_at";
        order: "asc" | "desc";
      };
    }): Promise<Pick<ChatSessionEt, C[number]>[]>;
  };
  update: (id: string, input: Pick<ChatSessionEt, "status">) => Promise<void>;
  delete: (id: string) => Promise<void>;
}
