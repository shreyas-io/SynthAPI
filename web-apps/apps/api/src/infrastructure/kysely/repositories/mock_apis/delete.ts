import type { DatabaseClient } from "../../index";

export const deleteMockApi =
  (client: DatabaseClient) =>
  async (id: string): Promise<void> => {
    await client.db.deleteFrom("mock_apis").where("id", "=", id).execute();
  };
