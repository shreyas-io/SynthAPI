import type { ChatSessionEt } from "../../chat_session";

type ChatSessionInput = Pick<
  ChatSessionEt,
  "agent_config_id" | "name" | "description" | "status"
>;
type ChatSessionUpdateInput = Pick<
  ChatSessionEt,
  "name" | "description" | "status"
>;
type ChatSessionStatus = ChatSessionEt["status"];
type ColumnKeys = Extract<keyof ChatSessionEt, string>;

export interface IChatSessionsRepository {
  count: (params: {
    filters: {
      ids?: string[];
      agent_config_ids?: string[];
      name?: string;
      description?: string;
      statuses?: ChatSessionStatus[];
    };
  }) => Promise<number>;
  create: (input: ChatSessionInput) => Promise<string>;
  list: {
    (params: {
      filters: {
        ids?: string[];
        agent_config_ids?: string[];
        name?: string;
        description?: string;
        statuses?: ChatSessionStatus[];
      };
      pagination?: {
        limit: number;
        offset: number;
      };
      sort?: {
        by: "name" | "created_at";
        order: "asc" | "desc";
      };
    }): Promise<ChatSessionEt[]>;
    <C extends readonly ColumnKeys[]>(params: {
      filters: {
        ids?: string[];
        agent_config_ids?: string[];
        name?: string;
        description?: string;
        statuses?: ChatSessionStatus[];
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
    }): Promise<Pick<ChatSessionEt, C[number]>[]>;
  };
  update: (id: string, input: ChatSessionUpdateInput) => Promise<void>;
  delete: (id: string) => Promise<void>;
}
