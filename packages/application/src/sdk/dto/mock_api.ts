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
  path: z.string(),
  name: z.string(),
  description: z.string().nullable().default(null),
  project_id: z.uuid(),
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
  offset: z.number().min(0).max(100),
});

export const listMockApisSortDto = z.object({
  by: z.enum(["name", "created_at"]),
  order: z.enum(["asc", "desc"]),
});

export const create_mock_api_response_dto = z.object({
  mock_api_id: z.uuid(),
  name: z.string(),
  status_code: z.number(),
  headers: z.record(z.string(), z.any()),
  body: z.record(z.string(), z.any()),
  latency_ms: 100,
});
