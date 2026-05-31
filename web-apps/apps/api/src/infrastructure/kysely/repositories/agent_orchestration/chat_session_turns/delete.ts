import type { DatabaseClient } from "../../../index";

export const deleteChatSessionTurn =
  (client: DatabaseClient) =>
  async (id: string): Promise<void> => {
    await client.db
      .deleteFrom("chat_session_turns")
      .where("id", "=", id)
      .execute();
  };
