import { z } from "zod";
import { mockApiPostResponseAction } from "./mock_api_post_response_actions";
import { createMockApiRuleTreeDto } from "./mock_api_rule_tree";

export const createMockApiResponseDto = z.object({
  mock_api_id: z.uuid(),
  name: z.string(),
  status_code: z.number(),
  headers: z.record(z.string(), z.any()),
  body: z.record(z.string(), z.any()),
  cookies: z.record(z.string(), z.any()),
  rule_tree: createMockApiRuleTreeDto,
  post_response_actions: z.array(mockApiPostResponseAction).default([]),
});
