import type { DatabaseClient } from "../../index";

export const deleteMockApiResponse =
  (client: DatabaseClient) =>
  async (id: string): Promise<void> => {
    await client.db
      .deleteFrom("mock_api_responses")
      .where("id", "=", id)
      .execute();
  };
