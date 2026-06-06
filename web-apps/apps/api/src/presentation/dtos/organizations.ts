import z from "zod";

export const createOrganizationDto = z.object({
  name: z.string().min(1).max(255),
});
