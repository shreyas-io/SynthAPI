import type { UpdateProjectInput } from "../../../../domain/entities/project";
import type { DatabaseClient } from "../../index";

export const updateProject =
  (client: DatabaseClient) =>
  async (id: string, input: UpdateProjectInput): Promise<void> => {
    await client.db
      .updateTable("projects")
      .set({
        name: input.name,
        description: input.description,
        globals: input.globals,
        constants: input.constants,
      })
      .where("id", "=", id)
      .execute();
  };
