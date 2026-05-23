import type { DatabaseClient } from "../../index";

export const deleteChatTurnEvent =
  (client: DatabaseClient) =>
  async (id: string): Promise<void> => {
    await client.db
      .deleteFrom("chat_turn_events")
      .where("id", "=", id)
      .execute();
  };
