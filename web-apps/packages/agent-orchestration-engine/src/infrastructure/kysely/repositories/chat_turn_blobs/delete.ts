import type { DatabaseClient } from "../../index";

export const deleteChatTurnBlob =
  (client: DatabaseClient) =>
  async (id: string): Promise<void> => {
    await client.db
      .deleteFrom("chat_turn_blobs")
      .where("id", "=", id)
      .execute();
  };
