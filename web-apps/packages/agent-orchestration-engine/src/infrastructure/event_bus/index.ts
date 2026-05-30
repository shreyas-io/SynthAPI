import type { IEventBus } from "../../domain/entities/interfaces/event_bus";
import type { ChatTurnEventEt } from "../../domain/entities/chat_turn_event";

export function InMemoryEventBus(): IEventBus {
  const subscriptions = new Map<
    string,
    Set<(event: ChatTurnEventEt) => void>
  >();

  return {
    publish(turn_id: string, event: ChatTurnEventEt): void {
      const handlers = subscriptions.get(turn_id);
      if (!handlers) return;

      for (const handler of handlers) {
        try {
          handler(event);
        } catch {
          // Swallow subscriber errors to avoid affecting other listeners.
        }
      }
    },

    subscribe(
      turn_id: string,
      handler: (event: ChatTurnEventEt) => void,
    ): () => void {
      if (!subscriptions.has(turn_id)) {
        subscriptions.set(turn_id, new Set());
      }

      const handlers = subscriptions.get(turn_id)!;
      handlers.add(handler);

      return () => {
        handlers.delete(handler);
        if (handlers.size === 0) {
          subscriptions.delete(turn_id);
        }
      };
    },
  };
}
