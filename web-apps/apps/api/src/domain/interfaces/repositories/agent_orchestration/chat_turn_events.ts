import type { ChatTurnEventEt } from "../../../entities/agent_orchestration/chat_turn_event";
import type { ChatTurnEventType } from "../../../entities/agent_orchestration/chat_turn_event";

type ChatTurnEventInput = Pick<
  ChatTurnEventEt,
  "chat_turn_id" | "sequence" | "event_type" | "payload"
>;
type ColumnKeys = Extract<keyof ChatTurnEventEt, string>;

export interface IChatTurnEventsRepository {
  count: (params: {
    filters: {
      ids?: string[] | undefined;
      chat_turn_ids?: string[] | undefined;
      chat_session_ids?: string[] | undefined;
      event_types?: ChatTurnEventType[] | undefined;
    };
  }) => Promise<number>;
  create: (input: ChatTurnEventInput) => Promise<string>;
  list: {
    (params: {
      filters: {
        ids?: string[] | undefined;
        chat_turn_ids?: string[] | undefined;
        chat_session_ids?: string[] | undefined;
        event_types?: ChatTurnEventType[] | undefined;
      };
      pagination?: {
        limit: number;
        offset: number;
      };
      sort?: {
        by: "sequence" | "created_at";
        order: "asc" | "desc";
      };
    }): Promise<ChatTurnEventEt[]>;
    <C extends readonly ColumnKeys[]>(params: {
      filters: {
        ids?: string[] | undefined;
        chat_turn_ids?: string[] | undefined;
        chat_session_ids?: string[] | undefined;
        event_types?: ChatTurnEventType[] | undefined;
      };
      columns: C;
      pagination?: {
        limit: number;
        offset: number;
      };
      sort?: {
        by: "sequence" | "created_at";
        order: "asc" | "desc";
      };
    }): Promise<Pick<ChatTurnEventEt, C[number]>[]>;
  };
  delete: (id: string) => Promise<void>;
}
