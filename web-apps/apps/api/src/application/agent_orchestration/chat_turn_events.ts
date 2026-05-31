import { AgentOrchestrationException } from "../../domain/exceptions/exception";
import { ChatTurnEventsUsecase } from "../../domain/usecases/agent_orchestration/chat_turn_events";
import type { AppContext } from "./context";
import {
  createChatTurnEventDto,
  listChatTurnEventsFilterDto,
  listChatTurnEventsPaginationDto,
  listChatTurnEventsSortDto,
} from "./validation/chat_turn_events";

export function ChatTurnEventsApplication(ctx: AppContext) {
  const chat_turn_events = ChatTurnEventsUsecase(ctx);

  return {
    createChatTurnEvent: (data: unknown) => {
      const {
        data: input,
        success,
        error,
      } = createChatTurnEventDto.safeParse(data);

      if (!success) {
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(error.issues),
        });
      }

      return chat_turn_events.createChatTurnEvent(input);
    },
    getChatTurnEvent: (id: string) => chat_turn_events.getChatTurnEvent(id),
    listChatTurnEvents: (
      filters: unknown,
      pagination: unknown,
      sort: unknown,
    ) => {
      const {
        data: parsed_filters,
        success: filters_success,
        error: filters_error,
      } = listChatTurnEventsFilterDto.safeParse(filters);
      if (!filters_success) {
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(filters_error.issues),
        });
      }

      const {
        data: parsed_pagination,
        success: pagination_success,
        error: pagination_error,
      } = listChatTurnEventsPaginationDto.safeParse(pagination);
      if (!pagination_success) {
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(pagination_error.issues),
        });
      }

      const {
        data: parsed_sort,
        success: sort_success,
        error: sort_error,
      } = listChatTurnEventsSortDto.safeParse(sort);
      if (!sort_success) {
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(sort_error.issues),
        });
      }

      return chat_turn_events.getChatTurnEvents(
        parsed_filters,
        parsed_pagination,
        parsed_sort,
      );
    },
    countChatTurnEvents: (filters: unknown) => {
      const {
        data: parsed_filters,
        success,
        error,
      } = listChatTurnEventsFilterDto.safeParse(filters);

      if (!success) {
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(error.issues),
        });
      }

      return chat_turn_events.countChatTurnEvents(parsed_filters);
    },
    deleteChatTurnEvent: (id: string) =>
      chat_turn_events.deleteChatTurnEvent(id),
  };
}
