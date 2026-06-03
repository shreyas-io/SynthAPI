import z from "zod";
import { variableTypesDto } from "./variables";

export const httpMethodDto = z.enum([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);

const requestBodyDto = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("json"),
    value: z.any(),
  }),
  z.object({
    type: z.literal("text"),
    value: z.string(),
  }),
  z.object({
    type: z.literal("form_urlencoded"),
    value: z.record(z.string(), z.union([z.string(), z.string().array()])),
  }),
  z.object({
    type: z.literal("empty"),
  }),
]);

export const createMockApiDto = z.object({
  method: httpMethodDto,
  path: z.string().max(4096),
  name: z.string().max(64),
  description: z.string().max(255).nullable().default(null),
  project_id: z.uuidv7(),
  variables: variableTypesDto.array().optional(),
});

export const listMockApisFilterDto = z.object({
  ids: z.uuidv7().array().optional(),
  project_ids: z.uuidv7().array().optional(),
  method: httpMethodDto.optional(),
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

export const executeMockApiDto = z.object({
  url: z.string(),
  headers: z.record(z.string(), z.any()).default({}),
  body: requestBodyDto.default({ type: "empty" }),
  cookies: z.record(z.string(), z.any()).default({}),
});

export const executePublicMockApiDto = executeMockApiDto.extend({
  project_slug: z.string(),
  method: httpMethodDto,
});
