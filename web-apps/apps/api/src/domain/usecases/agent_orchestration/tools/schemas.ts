import { z } from "zod";

const variableDto = z.object({
  name: z.string(),
  type: z.enum(["string", "number", "boolean", "array", "object"]),
  value: z.unknown(),
});

const responseBodyDto = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("json"),
    value: z.unknown(),
  }),
  z.object({
    type: z.literal("text"),
    value: z.string(),
  }),
  z.object({
    type: z.literal("empty"),
  }),
]);

export const paginationDto = z.object({
  limit: z.number().min(0).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export const listProjectsToolInputDto = paginationDto;

export const emptyToolInputDto = z.object({});

export const updateProjectGlobalsToolInputDto = z.object({
  globals: z.array(variableDto),
});

export const updateProjectConstantsToolInputDto = z.object({
  constants: z.array(variableDto),
});

export const listMockApisToolInputDto = paginationDto.extend({
  method: z
    .enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"])
    .optional(),
  path: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
});

export const getMockApiToolInputDto = z.object({
  mock_api_id: z.uuidv7(),
});

export const createMockApiToolInputDto = z.object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]),
  path: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  variables: z.array(variableDto).nullable().optional(),
});

export const updateMockApiToolInputDto = getMockApiToolInputDto.extend({
  method: z
    .enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"])
    .optional(),
  path: z.string().optional(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  variables: z.array(variableDto).nullable().optional(),
});

export const listMockApiResponsesToolInputDto = paginationDto.extend({
  mock_api_id: z.uuidv7(),
  name: z.string().optional(),
});

export const getMockApiResponseToolInputDto = z.object({
  response_id: z.uuidv7(),
});

export const createMockApiResponseToolInputDto = z.object({
  mock_api_id: z.uuidv7(),
  name: z.string(),
  is_default: z.boolean().default(false),
  response: z.object({
    status_code: z.number().min(100).max(599),
    headers: z.record(z.string(), z.unknown()).default({}),
    body: responseBodyDto,
    cookies: z.record(z.string(), z.unknown()).default({}),
  }),
  rule_tree: z.unknown().nullable().optional(),
  post_response_actions: z.array(z.unknown()).nullable().optional(),
});

export const updateMockApiResponseToolInputDto =
  getMockApiResponseToolInputDto.extend({
    name: z.string().optional(),
    is_default: z.boolean().optional(),
    response: z
      .object({
        status_code: z.number().min(100).max(599),
        headers: z.record(z.string(), z.unknown()).default({}),
        body: responseBodyDto,
        cookies: z.record(z.string(), z.unknown()).default({}),
      })
      .optional(),
    rule_tree: z.unknown().nullable().optional(),
    post_response_actions: z.array(z.unknown()).nullable().optional(),
  });
