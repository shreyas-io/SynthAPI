import type { IChatTurnBlobsRepository } from "../../../../domain/entities/interfaces/repositories/chat_turn_blobs";
import type { DatabaseClient } from "../../index";
import { count } from "./count";
import { createChatTurnBlob } from "./create";
import { deleteChatTurnBlob } from "./delete";
import { list } from "./list";

export const ChatTurnBlobsRepository = (
  client: DatabaseClient,
): IChatTurnBlobsRepository => ({
  count: count(client),
  create: createChatTurnBlob(client),
  list: list(client),
  delete: deleteChatTurnBlob(client),
});
