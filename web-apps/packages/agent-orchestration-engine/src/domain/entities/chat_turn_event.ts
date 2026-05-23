import type {
  ChatTurnEventPayload,
  ChatTurnEventType,
} from "./chat";

export type ChatTurnEventEt = {
  id: string;
  chat_turn_id: string;
  sequence: number;
  event_type: ChatTurnEventType;
  payload: ChatTurnEventPayload;
  created_at: Date;
};
