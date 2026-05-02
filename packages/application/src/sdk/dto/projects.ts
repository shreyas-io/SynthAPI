import z from "zod";

export const create_project_dto = z.object({
  name: z.string(),
  description: z.string(),
});
