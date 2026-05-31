import type { IChatSessionTurnsRepository } from "../../../../../domain/interfaces/repositories/agent_orchestration/chat_session_turns";
import type { DatabaseClient } from "../../../index";
import { count } from "./count";
import { createChatSessionTurn } from "./create";
import { deleteChatSessionTurn } from "./delete";
import { list } from "./list";
import { updateChatSessionTurn } from "./update";

export const ChatSessionTurnsRepository = (
  client: DatabaseClient,
): IChatSessionTurnsRepository => ({
  count: count(client),
  create: createChatSessionTurn(client),
  list: list(client),
  update: updateChatSessionTurn(client),
  delete: deleteChatSessionTurn(client),
});
