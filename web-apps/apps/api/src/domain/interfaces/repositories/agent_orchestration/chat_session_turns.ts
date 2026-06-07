import type { ChatSessionTurnEt } from "../../../entities/agent_orchestration/chat_session_turn";

type ChatSessionTurnInput = Pick<
  ChatSessionTurnEt,
  "chat_session_id" | "mode" | "user_input" | "conversation_context" | "status"
>;
type ChatSessionTurnUpdateInput = Pick<
  ChatSessionTurnEt,
  "conversation_context" | "status"
>;
type ChatTurnMode = ChatSessionTurnEt["mode"];
type ChatTurnStatus = ChatSessionTurnEt["status"];
type ColumnKeys = Extract<keyof ChatSessionTurnEt, string>;

export interface IChatSessionTurnsRepository {
  count: (params: {
    filters: {
      ids?: string[] | undefined;
      chat_session_ids?: string[] | undefined;
      modes?: ChatTurnMode[] | undefined;
      statuses?: ChatTurnStatus[] | undefined;
    };
  }) => Promise<number>;
  create: (input: ChatSessionTurnInput) => Promise<string>;
  list: {
    (params: {
      filters: {
        ids?: string[] | undefined;
        chat_session_ids?: string[] | undefined;
        modes?: ChatTurnMode[] | undefined;
        statuses?: ChatTurnStatus[] | undefined;
      };
      pagination?: {
        limit: number;
        offset: number;
      };
      sort?: {
        by: "created_at";
        order: "asc" | "desc";
      };
    }): Promise<ChatSessionTurnEt[]>;
    <C extends readonly ColumnKeys[]>(params: {
      filters: {
        ids?: string[] | undefined;
        chat_session_ids?: string[] | undefined;
        modes?: ChatTurnMode[] | undefined;
        statuses?: ChatTurnStatus[] | undefined;
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
    }): Promise<Pick<ChatSessionTurnEt, C[number]>[]>;
  };
  update: (id: string, input: ChatSessionTurnUpdateInput) => Promise<void>;
  delete: (id: string) => Promise<void>;
}
