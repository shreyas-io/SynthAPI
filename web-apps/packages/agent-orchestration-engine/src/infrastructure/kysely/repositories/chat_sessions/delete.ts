import type { DatabaseClient } from "../../index";

export const deleteChatSession =
  (client: DatabaseClient) =>
  async (id: string): Promise<void> => {
    await client.db.deleteFrom("chat_sessions").where("id", "=", id).execute();
  };
