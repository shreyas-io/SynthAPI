import type { CreateProjectInput } from "../../../../domain/entities/project";
import type { DatabaseClient } from "../../index";

export const createProject =
  (client: DatabaseClient) =>
  async (input: CreateProjectInput): Promise<void> => {
    await client.db
      .insertInto("projects")
      .values({
        name: input.name,
        description: input.description,
        globals: input.globals,
        constants: input.constants,
      })
      .execute();
  };
