import type { ChatSessionEt } from "../../../../domain/entities/chat_session";
import type { DatabaseClient } from "../../index";

type ChatSessionUpdateInput = Pick<
  ChatSessionEt,
  "name" | "description" | "status"
>;

export const updateChatSession =
  (client: DatabaseClient) =>
  async (id: string, input: ChatSessionUpdateInput): Promise<void> => {
    await client.db
      .updateTable("chat_sessions")
      .set({
        name: input.name,
        description: input.description,
        status: input.status,
      })
      .where("id", "=", id)
      .execute();
  };
