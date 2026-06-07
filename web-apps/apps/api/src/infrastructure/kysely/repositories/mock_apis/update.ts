import type { MockApiEt } from "../../../../domain/entities/mock_api";
import type { DatabaseClient } from "../../index";

type MockApiInput = Pick<
  MockApiEt,
  "project_id" | "method" | "path" | "name" | "description" | "variables"
>;

export const updateMockApi =
  (client: DatabaseClient) =>
  async (id: string, input: MockApiInput): Promise<void> => {
    await client.db
      .updateTable("mock_apis")
      .set({
        project_id: input.project_id,
        method: input.method,
        path: input.path,
        name: input.name,
        description: input.description,
        ...(input.variables
          ? { variables: JSON.stringify(input.variables) }
          : {}),
      })
      .where("id", "=", id)
      .execute();
  };
