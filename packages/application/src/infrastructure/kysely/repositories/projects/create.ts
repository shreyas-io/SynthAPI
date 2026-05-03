import type { ProjectEt } from "../../../../domain/entities/project";
import type { DatabaseClient } from "../../index";
import { uuidv7 } from "uuidv7";

type ProjectInput = Pick<
  ProjectEt,
  "name" | "description" | "globals" | "constants"
>;

export const createProject =
  (client: DatabaseClient) =>
  async (input: ProjectInput): Promise<string> => {
    const id = uuidv7();
    await client.db
      .insertInto("projects")
      .values({
        id,
        name: input.name,
        description: input.description,
        globals: JSON.stringify(input.globals),
        constants: JSON.stringify(input.constants),
      })
      .executeTakeFirstOrThrow();
    return id;
  };
