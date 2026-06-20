import { z } from "zod";
import { mockApiPostResponseActionDto } from "./mock_api_post_response_actions";
import { createMockApiRuleTreeDto } from "./mock_api_rule_tree";
import { sseBodySchema } from "../../../domain/entities/mock_api_response/sse";

const responseBodyDto = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("json"),
    value: z.any(),
  }),
  z.object({
    type: z.literal("text"),
    value: z.string(),
  }),
  z.object({
    type: z.literal("empty"),
  }),
  sseBodySchema,
  z.object({
    type: z.literal("json_script"),
    code: z.string(),
  }),
]);

const responseDto = z.object({
  status_code: z.number().min(100).max(599),
  headers: z.record(z.string(), z.any()),
  body: responseBodyDto,
  cookies: z.record(z.string(), z.any()),
});

export const createMockApiResponseDto = z.object({
  mock_api_id: z.uuidv7(),
  name: z.string().max(64),
  is_default: z.boolean().default(false),
  response: responseDto,
  rule_tree: createMockApiRuleTreeDto.nullable().optional(),
  post_response_actions: z.array(mockApiPostResponseActionDto).optional(),
  execution_order: z.number().int().min(1).optional(),
});

export const listMockApiResponsesFilterDto = z.object({
  ids: z.uuidv7().array().optional(),
  mock_api_ids: z.uuidv7().array().optional(),
  name: z.string().optional(),
  fetch_deleted: z.boolean().optional(),
});

export const listMockApiResponsesPaginationDto = z.object({
  limit: z.number().min(0).max(100),
  offset: z.number().min(0),
});

export const listMockApiResponsesSortDto = z.object({
  by: z.enum(["name", "created_at", "execution_order"]),
  order: z.enum(["asc", "desc"]),
});
