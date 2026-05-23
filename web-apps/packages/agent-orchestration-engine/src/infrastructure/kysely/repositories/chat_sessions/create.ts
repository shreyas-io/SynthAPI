import { uuidv7 } from "uuidv7";

import type { ChatSessionEt } from "../../../../domain/entities/chat_session";
import type { DatabaseClient } from "../../index";

type ChatSessionInput = Pick<
  ChatSessionEt,
  "agent_config_id" | "name" | "description" | "status"
>;

export const createChatSession =
  (client: DatabaseClient) =>
  async (input: ChatSessionInput): Promise<string> => {
    const id = uuidv7();

    await client.db
      .insertInto("chat_sessions")
      .values({
        id,
        agent_config_id: input.agent_config_id,
        name: input.name,
        description: input.description,
        status: input.status,
      })
      .executeTakeFirstOrThrow();

    return id;
  };
