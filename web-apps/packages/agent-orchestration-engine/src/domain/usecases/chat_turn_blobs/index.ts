import type { AppContext } from "../../..";
import {
  AgentOrchestrationException,
  HttpStatusCode,
} from "../../../exceptions/exception";
import { ChatTurnBlobsRepository } from "../../../infrastructure/kysely/repositories/chat_turn_blobs";
import type {
  ChatTurnBlobEt,
  ChatTurnBlobMimeType,
} from "../../entities/chat_turn_blob";

type ChatTurnBlobInput = Pick<
  ChatTurnBlobEt,
  "mime_type" | "size_bytes" | "content"
>;
type ChatTurnBlobFilters = {
  ids?: string[];
  mime_types?: ChatTurnBlobMimeType[];
};
type ChatTurnBlobPagination = {
  limit: number;
  offset: number;
};
type ChatTurnBlobSort = {
  by: "created_at";
  order: "asc" | "desc";
};

export const ChatTurnBlobsUsecase = (ctx: AppContext) => {
  const chat_turn_blobs_repository = ChatTurnBlobsRepository(ctx.database);

  const getChatTurnBlob = async (id: string): Promise<ChatTurnBlobEt> => {
    const chat_turn_blobs = await chat_turn_blobs_repository.list({
      filters: { ids: [id] },
    });
    const chat_turn_blob = chat_turn_blobs.at(0);

    if (!chat_turn_blob) {
      throw new AgentOrchestrationException({
        public_message: "Chat turn blob not found.",
        status_code: HttpStatusCode.NOT_FOUND,
      });
    }

    return chat_turn_blob;
  };

  return {
    createChatTurnBlob: async (
      input: ChatTurnBlobInput,
    ): Promise<ChatTurnBlobEt> => {
      const id = await chat_turn_blobs_repository.create(input);

      return getChatTurnBlob(id);
    },
    getChatTurnBlob,
    getChatTurnBlobs: async (
      filters: ChatTurnBlobFilters,
      pagination: ChatTurnBlobPagination,
      sort: ChatTurnBlobSort,
    ) => {
      const [total, records] = await Promise.all([
        chat_turn_blobs_repository.count({ filters }),
        chat_turn_blobs_repository.list({
          filters,
          pagination,
          sort,
        }),
      ]);

      return { total, records };
    },
    countChatTurnBlobs(filters: ChatTurnBlobFilters): Promise<number> {
      return chat_turn_blobs_repository.count({ filters });
    },
    deleteChatTurnBlob(id: string): Promise<void> {
      return chat_turn_blobs_repository.delete(id);
    },
  };
};
