import { PostResponseActionsEt } from "./post_response_actions";
import type { MockApiRuleTreeEt } from "./rule_tree";

type RateLimitConfigEt = {
  config: {
    type: "identifier";
    /**
     * Key will just support template params.
     * Each request, we just build the key from request and globals.
     * We will maintain a data structure in redis which will store data
     */
    key: string;
    number_of_requests: number;
    time_interval: number;
  };
  response: ApiResponseEt;
};

type ApiResponseEt = {
  status_code: number;
  headers: Record<string, any>;
  body: Record<string, any>;
  cookies: Record<string, any>;
};

export type MockApiResponseEt = {
  id: string;
  mock_api_id: string;
  name: string;
  response: ApiResponseEt;
  rate_limit_config: Array<RateLimitConfigEt>;
  rule_tree: MockApiRuleTreeEt;
  post_response_actions: PostResponseActionsEt;
  created_at: Date;
  updated_at: Date;
};
