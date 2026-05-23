import type { AppContext } from "../..";
import { ChatTurnEventsUsecase } from "../../domain/usecases/chat_turn_events";
import { AgentOrchestrationException } from "../../exceptions/exception";
import {
  createChatTurnEventDto,
  listChatTurnEventsFilterDto,
  listChatTurnEventsPaginationDto,
  listChatTurnEventsSortDto,
} from "../dto/chat_turn_events";

export function ChatTurnEvents(ctx: AppContext) {
  const chat_turn_events = ChatTurnEventsUsecase(ctx);

  return {
    createChatTurnEvent: (data: unknown) => {
      const { data: v, success, error } = createChatTurnEventDto.safeParse(data);

      if (!success)
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(error.issues),
        });

      return chat_turn_events.createChatTurnEvent(v);
    },
    getChatTurnEvent: (id: string) => chat_turn_events.getChatTurnEvent(id),
    listChatTurnEvents: (
      filters: unknown,
      pagination: unknown,
      sort: unknown,
    ) => {
      const {
        data: f,
        success: s_0,
        error: e_0,
      } = listChatTurnEventsFilterDto.safeParse(filters);
      if (!s_0)
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(e_0.issues),
        });

      const {
        data: p,
        success: s_1,
        error: e_1,
      } = listChatTurnEventsPaginationDto.safeParse(pagination);
      if (!s_1)
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(e_1.issues),
        });

      const {
        data: s,
        success: s_2,
        error: e_2,
      } = listChatTurnEventsSortDto.safeParse(sort);
      if (!s_2)
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(e_2.issues),
        });

      return chat_turn_events.getChatTurnEvents(f, p, s);
    },
    countChatTurnEvents: (filters: unknown) => {
      const { data: f, success, error } =
        listChatTurnEventsFilterDto.safeParse(filters);

      if (!success)
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(error.issues),
        });

      return chat_turn_events.countChatTurnEvents(f);
    },
    deleteChatTurnEvent: (id: string) =>
      chat_turn_events.deleteChatTurnEvent(id),
  };
}
