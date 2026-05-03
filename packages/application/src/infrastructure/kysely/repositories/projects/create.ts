import type { ProjectEt } from "../../../../domain/entities/project";
import type { DatabaseClient } from "../../index";

type ProjectInput = Pick<
  ProjectEt,
  "name" | "description" | "globals" | "constants"
>;

export const createProject =
  (client: DatabaseClient) =>
  async (input: ProjectInput): Promise<void> => {
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
