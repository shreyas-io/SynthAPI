import type { ProjectEt } from "../../../../domain/entities/project";
import type { DatabaseClient } from "../../index";

type ProjectInput = Pick<
  ProjectEt,
  "slug" | "name" | "description" | "globals" | "constants"
>;

export const updateProject =
  (client: DatabaseClient) =>
  async (id: string, input: ProjectInput): Promise<void> => {
    await client.db
      .updateTable("projects")
      .set({
        slug: input.slug,
        name: input.name,
        description: input.description,
        ...(input.globals ? { globals: JSON.stringify(input.globals) } : {}),
        ...(input.constants
          ? { constants: JSON.stringify(input.constants) }
          : {}),
      })
      .where("id", "=", id)
      .execute();
  };
