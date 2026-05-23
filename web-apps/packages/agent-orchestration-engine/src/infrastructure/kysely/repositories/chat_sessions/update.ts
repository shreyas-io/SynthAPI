import type { ChatSessionEt } from "../../../../domain/entities/chat_session";
import type { DatabaseClient } from "../../index";

export const updateChatSession =
  (client: DatabaseClient) =>
  async (id: string, input: Pick<ChatSessionEt, "status">): Promise<void> => {
    await client.db
      .updateTable("chat_sessions")
      .set({
        status: input.status,
      })
      .where("id", "=", id)
      .execute();
  };
