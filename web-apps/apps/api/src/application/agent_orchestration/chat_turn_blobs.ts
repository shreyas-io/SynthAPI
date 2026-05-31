import { AgentOrchestrationException } from "../../domain/exceptions/exception";
import { ChatTurnBlobsUsecase } from "../../domain/usecases/agent_orchestration/chat_turn_blobs";
import type { AppContext } from "./context";
import {
  createChatTurnBlobDto,
  listChatTurnBlobsFilterDto,
  listChatTurnBlobsPaginationDto,
  listChatTurnBlobsSortDto,
} from "./validation/chat_turn_blobs";

export function ChatTurnBlobsApplication(ctx: AppContext) {
  const chat_turn_blobs = ChatTurnBlobsUsecase(ctx);

  return {
    createChatTurnBlob: (data: unknown) => {
      const { data: input, success, error } =
        createChatTurnBlobDto.safeParse(data);

      if (!success) {
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(error.issues),
        });
      }

      return chat_turn_blobs.createChatTurnBlob(input);
    },
    getChatTurnBlob: (id: string) => chat_turn_blobs.getChatTurnBlob(id),
    listChatTurnBlobs: (
      filters: unknown,
      pagination: unknown,
      sort: unknown,
    ) => {
      const {
        data: parsed_filters,
        success: filters_success,
        error: filters_error,
      } = listChatTurnBlobsFilterDto.safeParse(filters);
      if (!filters_success) {
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(filters_error.issues),
        });
      }

      const {
        data: parsed_pagination,
        success: pagination_success,
        error: pagination_error,
      } = listChatTurnBlobsPaginationDto.safeParse(pagination);
      if (!pagination_success) {
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(pagination_error.issues),
        });
      }

      const {
        data: parsed_sort,
        success: sort_success,
        error: sort_error,
      } = listChatTurnBlobsSortDto.safeParse(sort);
      if (!sort_success) {
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(sort_error.issues),
        });
      }

      return chat_turn_blobs.getChatTurnBlobs(
        parsed_filters,
        parsed_pagination,
        parsed_sort,
      );
    },
    countChatTurnBlobs: (filters: unknown) => {
      const { data: parsed_filters, success, error } =
        listChatTurnBlobsFilterDto.safeParse(filters);

      if (!success) {
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(error.issues),
        });
      }

      return chat_turn_blobs.countChatTurnBlobs(parsed_filters);
    },
    deleteChatTurnBlob: (id: string) => chat_turn_blobs.deleteChatTurnBlob(id),
  };
}
