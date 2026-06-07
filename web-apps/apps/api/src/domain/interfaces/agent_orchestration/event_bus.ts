import { ChatTurnStreamingEventPayload } from "../../entities/agent_orchestration/chat_turn_event";

export interface IEventBus {
  publish(turn_id: string, event: ChatTurnStreamingEventPayload): void;
  subscribe(
    turn_id: string,
    handler: (event: ChatTurnStreamingEventPayload) => void,
  ): () => void;
}
