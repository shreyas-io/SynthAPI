import type { ChatSessionEt } from "../../../entities/agent_orchestration/chat_session";

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
      ids?: string[] | undefined;
      agent_config_ids?: string[] | undefined;
      name?: string | undefined;
      description?: string | undefined;
      statuses?: ChatSessionStatus[] | undefined;
    };
  }) => Promise<number>;
  create: (input: ChatSessionInput) => Promise<string>;
  list: {
    (params: {
      filters: {
        ids?: string[] | undefined;
        agent_config_ids?: string[] | undefined;
        name?: string | undefined;
        description?: string | undefined;
        statuses?: ChatSessionStatus[] | undefined;
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
        ids?: string[] | undefined;
        agent_config_ids?: string[] | undefined;
        name?: string | undefined;
        description?: string | undefined;
        statuses?: ChatSessionStatus[] | undefined;
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
