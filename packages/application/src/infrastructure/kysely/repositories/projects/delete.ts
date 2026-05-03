import type { DatabaseClient } from "../../index";

export const deleteProject =
  (client: DatabaseClient) =>
  async (id: string): Promise<void> => {
    await client.db.deleteFrom("projects").where("id", "=", id).execute();
  };
