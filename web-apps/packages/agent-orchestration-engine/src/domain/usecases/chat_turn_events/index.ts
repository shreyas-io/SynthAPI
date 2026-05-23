import type { AppContext } from "../../..";
import {
  AgentOrchestrationException,
  HttpStatusCode,
} from "../../../exceptions/exception";
import { ChatTurnEventsRepository } from "../../../infrastructure/kysely/repositories/chat_turn_events";
import type {
  ChatTurnEventEt,
  ChatTurnEventType,
} from "../../entities/chat_turn_event";

type ChatTurnEventInput = Pick<
  ChatTurnEventEt,
  "chat_turn_id" | "sequence" | "event_type" | "payload"
>;
type ChatTurnEventFilters = {
  ids?: string[];
  chat_turn_ids?: string[];
  event_types?: ChatTurnEventType[];
};
type ChatTurnEventPagination = {
  limit: number;
  offset: number;
};
type ChatTurnEventSort = {
  by: "sequence" | "created_at";
  order: "asc" | "desc";
};

export const ChatTurnEventsUsecase = (ctx: AppContext) => {
  const chat_turn_events_repository = ChatTurnEventsRepository(ctx.database);

  const getChatTurnEvent = async (id: string): Promise<ChatTurnEventEt> => {
    const chat_turn_events = await chat_turn_events_repository.list({
      filters: { ids: [id] },
    });
    const chat_turn_event = chat_turn_events.at(0);

    if (!chat_turn_event) {
      throw new AgentOrchestrationException({
        public_message: "Chat turn event not found.",
        status_code: HttpStatusCode.NOT_FOUND,
      });
    }

    return chat_turn_event;
  };

  return {
    createChatTurnEvent: async (
      input: ChatTurnEventInput,
    ): Promise<ChatTurnEventEt> => {
      const id = await chat_turn_events_repository.create(input);

      return getChatTurnEvent(id);
    },
    getChatTurnEvent,
    getChatTurnEvents: async (
      filters: ChatTurnEventFilters,
      pagination: ChatTurnEventPagination,
      sort: ChatTurnEventSort,
    ) => {
      const [total, records] = await Promise.all([
        chat_turn_events_repository.count({ filters }),
        chat_turn_events_repository.list({
          filters,
          pagination,
          sort,
        }),
      ]);

      return { total, records };
    },
    countChatTurnEvents(filters: ChatTurnEventFilters): Promise<number> {
      return chat_turn_events_repository.count({ filters });
    },
    deleteChatTurnEvent(id: string): Promise<void> {
      return chat_turn_events_repository.delete(id);
    },
  };
};
