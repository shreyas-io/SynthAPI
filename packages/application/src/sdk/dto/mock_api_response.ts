import { z } from "zod";
import { mockApiPostResponseAction } from "./mock_api_post_response_actions";
import { createMockApiRuleTreeDto } from "./mock_api_rule_tree";

const responseDto = z.object({
  status_code: z.number().min(100).max(599),
  headers: z.record(z.string(), z.any()),
  body: z.record(z.string(), z.any()),
  cookies: z.record(z.string(), z.any()),
});

export const createMockApiResponseDto = z.object({
  mock_api_id: z.uuidv7(),
  name: z.string().max(64),
  response: responseDto,
  rule_tree: createMockApiRuleTreeDto.optional(),
  post_response_actions: z.array(mockApiPostResponseAction).optional(),
});

export const listMockApiResponsesFilterDto = z.object({
  ids: z.uuidv7().array().optional(),
  mock_api_ids: z.uuidv7().array().optional(),
  name: z.string().optional(),
});

export const listMockApiResponsesPaginationDto = z.object({
  limit: z.number().min(0).max(100),
  offset: z.number().min(0),
});

export const listMockApiResponsesSortDto = z.object({
  by: z.enum(["name", "created_at"]),
  order: z.enum(["asc", "desc"]),
});
