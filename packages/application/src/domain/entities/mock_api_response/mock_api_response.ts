import { PostResponseActionsEt } from "./post_response_actions";
import type { MockApiRuleTreeEt } from "./rule_tree";

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
  rule_tree: MockApiRuleTreeEt | null;
  post_response_actions: PostResponseActionsEt | null;
  created_at: Date;
  updated_at: Date;
};
