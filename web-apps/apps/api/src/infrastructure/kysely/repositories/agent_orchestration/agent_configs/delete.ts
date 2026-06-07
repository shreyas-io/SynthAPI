import type { DatabaseClient } from "../../../index";

export const deleteAgentConfig =
  (client: DatabaseClient) =>
  async (id: string): Promise<void> => {
    await client.db.deleteFrom("agent_configs").where("id", "=", id).execute();
  };
