import type { ProjectEt } from "../../../../domain/entities/project";
import type { DatabaseClient } from "../../index";

type ProjectInput = Pick<
  ProjectEt,
  "name" | "description" | "globals" | "constants"
>;

export const updateProject =
  (client: DatabaseClient) =>
  async (id: string, input: ProjectInput): Promise<void> => {
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
