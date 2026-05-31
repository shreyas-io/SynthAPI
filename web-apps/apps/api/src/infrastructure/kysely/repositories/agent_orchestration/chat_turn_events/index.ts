import type { IChatTurnEventsRepository } from "../../../../../domain/interfaces/repositories/agent_orchestration/chat_turn_events";
import type { DatabaseClient } from "../../../index";
import { count } from "./count";
import { createChatTurnEvent } from "./create";
import { deleteChatTurnEvent } from "./delete";
import { list } from "./list";

export const ChatTurnEventsRepository = (
  client: DatabaseClient,
): IChatTurnEventsRepository => ({
  count: count(client),
  create: createChatTurnEvent(client),
  list: list(client),
  delete: deleteChatTurnEvent(client),
});
