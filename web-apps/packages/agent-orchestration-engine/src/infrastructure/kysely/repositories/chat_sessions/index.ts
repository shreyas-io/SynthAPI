import type { IChatSessionsRepository } from "../../../../domain/entities/interfaces/repositories/chat_sessions";
import type { DatabaseClient } from "../../index";
import { count } from "./count";
import { createChatSession } from "./create";
import { deleteChatSession } from "./delete";
import { list } from "./list";
import { updateChatSession } from "./update";

export const ChatSessionsRepository = (
  client: DatabaseClient,
): IChatSessionsRepository => ({
  count: count(client),
  create: createChatSession(client),
  list: list(client),
  update: updateChatSession(client),
  delete: deleteChatSession(client),
});
