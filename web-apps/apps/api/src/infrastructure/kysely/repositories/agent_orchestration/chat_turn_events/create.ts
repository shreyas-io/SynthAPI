import { uuidv7 } from "uuidv7";

import type { ChatTurnEventEt } from "../../../../../domain/entities/agent_orchestration/chat_turn_event";
import type { DatabaseClient } from "../../../index";

type ChatTurnEventInput = Pick<
  ChatTurnEventEt,
  "chat_turn_id" | "sequence" | "event_type" | "payload"
>;

export const createChatTurnEvent =
  (client: DatabaseClient) =>
  async (input: ChatTurnEventInput): Promise<string> => {
    const id = uuidv7();

    await client.db
      .insertInto("chat_turn_events")
      .values({
        id,
        chat_turn_id: input.chat_turn_id,
        sequence: input.sequence,
        event_type: input.event_type,
        payload: JSON.stringify(input.payload),
      })
      .executeTakeFirstOrThrow();

    return id;
  };
