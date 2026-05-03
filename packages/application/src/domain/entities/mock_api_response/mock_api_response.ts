import { PostResponseActionsEt } from "./post_response_actions";
import type { MockApiRuleTreeEt } from "./rule_tree";

export type MockApiResponseEt = {
  id: string;
  mock_api_id: string;
  name: string;
  status_code: number;
  headers: Record<string, any>;
  body: Record<string, any>;
  cookies: Record<string, any>;
  rule_tree: MockApiRuleTreeEt;
  post_response_actions: PostResponseActionsEt;
  created_at: Date;
  updated_at: Date;
};
