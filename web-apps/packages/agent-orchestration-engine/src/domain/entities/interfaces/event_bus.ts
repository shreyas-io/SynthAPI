import type { ChatTurnEventEt } from "../chat_turn_event";

export interface IEventBus {
  publish(turn_id: string, event: ChatTurnEventEt): void;
  subscribe(
    turn_id: string,
    handler: (event: ChatTurnEventEt) => void,
  ): () => void;
}
