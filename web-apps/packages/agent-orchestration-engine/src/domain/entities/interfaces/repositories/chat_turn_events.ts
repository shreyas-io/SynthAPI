import type { ChatTurnEventEt } from "../../chat_turn_event";
import type { ChatTurnEventType } from "../../chat";

type ChatTurnEventInput = Pick<
  ChatTurnEventEt,
  "chat_turn_id" | "sequence" | "event_type" | "payload"
>;
type ColumnKeys = Extract<keyof ChatTurnEventEt, string>;

export interface IChatTurnEventsRepository {
  count: (params: {
    filters: {
      ids?: string[];
      chat_turn_ids?: string[];
      event_types?: ChatTurnEventType[];
    };
  }) => Promise<number>;
  create: (input: ChatTurnEventInput) => Promise<string>;
  list: {
    (params: {
      filters: {
        ids?: string[];
        chat_turn_ids?: string[];
        event_types?: ChatTurnEventType[];
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
        ids?: string[];
        chat_turn_ids?: string[];
        event_types?: ChatTurnEventType[];
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
