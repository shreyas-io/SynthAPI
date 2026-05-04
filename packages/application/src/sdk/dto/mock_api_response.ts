import { z } from "zod";
import { mockApiPostResponseAction } from "./mock_api_post_response_actions";
import { createMockApiRuleTreeDto } from "./mock_api_rule_tree";

const responseDto = z.object({
  status_code: z.number(),
  headers: z.record(z.string(), z.any()),
  body: z.record(z.string(), z.any()),
  cookies: z.record(z.string(), z.any()),
});

const rateLimitConfigDto = z.object({
  config: z.object({
    type: z.literal("identifier"),
    label: z.string(),
    number_of_requests: z.number().int().min(0),
    time_interval_ms: z.number().int().min(0),
  }),
  response: responseDto,
});

export const createMockApiResponseDto = z.object({
  mock_api_id: z.uuidv7(),
  label: z.string().max(64),
  response: responseDto,
  rate_limt_config: rateLimitConfigDto.array().optional(),
  rule_tree: createMockApiRuleTreeDto.optional(),
  post_response_actions: z.array(mockApiPostResponseAction).optional(),
});
