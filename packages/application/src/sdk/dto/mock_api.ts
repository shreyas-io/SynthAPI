import z from "zod";

const httpMethod = z.enum([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);

export const createMockApiDto = z.object({
  method: httpMethod,
  path: z.string().max(4096),
  name: z.string().max(64),
  description: z.string().max(255).nullable().default(null),
  project_id: z.uuidv7(),
});

export const listMockApisFilterDto = z.object({
  ids: z.uuidv7().array().optional(),
  project_ids: z.uuidv7().array().optional(),
  method: httpMethod.optional(),
  path: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
});

export const listMockApisPaginationDto = z.object({
  limit: z.number().min(0).max(100),
  offset: z.number().min(0),
});

export const listMockApisSortDto = z.object({
  by: z.enum(["name", "created_at"]),
  order: z.enum(["asc", "desc"]),
});
