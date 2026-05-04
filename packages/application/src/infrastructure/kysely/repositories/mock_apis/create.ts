import type { MockApiEt } from "../../../../domain/entities/mock_api";
import type { DatabaseClient } from "../../index";
import { uuidv7 } from "uuidv7";

type MockApiInput = Pick<
  MockApiEt,
  "project_id" | "method" | "path" | "name" | "description" | "variables"
>;

export const createMockApi =
  (client: DatabaseClient) =>
  async (input: MockApiInput): Promise<string> => {
    const id = uuidv7();

    await client.db
      .insertInto("mock_apis")
      .values({
        id,
        project_id: input.project_id,
        method: input.method,
        path: input.path,
        name: input.name,
        description: input.description,
        ...(input.variables
          ? { variables: JSON.stringify(input.variables) }
          : {}),
      })
      .executeTakeFirstOrThrow();

    return id;
  };
