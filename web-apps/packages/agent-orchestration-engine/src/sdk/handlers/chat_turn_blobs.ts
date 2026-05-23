import type { AppContext } from "../..";
import { AgentOrchestrationException } from "../../exceptions/exception";
import { ChatTurnBlobsRepository } from "../../infrastructure/kysely/repositories/chat_turn_blobs";
import {
  createChatTurnBlobDto,
  listChatTurnBlobsFilterDto,
  listChatTurnBlobsPaginationDto,
  listChatTurnBlobsSortDto,
} from "../dto/chat_turn_blobs";

export function ChatTurnBlobs(ctx: AppContext) {
  const chat_turn_blobs = ChatTurnBlobsRepository(ctx.database);

  return {
    createChatTurnBlob: (data: unknown) => {
      const { data: v, success, error } = createChatTurnBlobDto.safeParse(data);

      if (!success)
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(error.issues),
        });

      return chat_turn_blobs.create(v);
    },
    listChatTurnBlobs: (
      filters: unknown,
      pagination: unknown,
      sort: unknown,
    ) => {
      const {
        data: f,
        success: s_0,
        error: e_0,
      } = listChatTurnBlobsFilterDto.safeParse(filters);
      if (!s_0)
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(e_0.issues),
        });

      const {
        data: p,
        success: s_1,
        error: e_1,
      } = listChatTurnBlobsPaginationDto.safeParse(pagination);
      if (!s_1)
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(e_1.issues),
        });

      const {
        data: s,
        success: s_2,
        error: e_2,
      } = listChatTurnBlobsSortDto.safeParse(sort);
      if (!s_2)
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(e_2.issues),
        });

      return chat_turn_blobs.list({ filters: f, pagination: p, sort: s });
    },
    countChatTurnBlobs: (filters: unknown) => {
      const { data: f, success, error } =
        listChatTurnBlobsFilterDto.safeParse(filters);

      if (!success)
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(error.issues),
        });

      return chat_turn_blobs.count({ filters: f });
    },
    deleteChatTurnBlob: (id: string) => chat_turn_blobs.delete(id),
  };
}
