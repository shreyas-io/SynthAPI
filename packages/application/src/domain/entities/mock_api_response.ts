export type MockApiResponseEt = {
  id: string;
  mock_api_id: string;
  name: string;
  rule_tree: Record<string, any>;
  response: Record<string, any>;
  post_response_actions: Record<string, any>;
  created_at: Date;
  updated_at: Date;
};
