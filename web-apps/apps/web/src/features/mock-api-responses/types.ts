export type PredicateValue =
  | string
  | number
  | boolean
  | null
  | Record<string, unknown>
  | unknown[];

export type RulePredicate = {
  label: string;
  type: "simple";
  actual: string;
  operator: string;
  expected?: PredicateValue;
};

export type RuleTree = {
  label: string;
  type: "and" | "or";
  predicates: RulePredicate[];
  children: RuleTree[];
};

export type ResponseBody =
  | { type: "json"; value: unknown }
  | { type: "text"; value: string }
  | { type: "empty" };

export type MockApiResponse = {
  id: string;
  mock_api_id: string;
  name: string;
  is_default: boolean;
  response: {
    status_code: number;
    headers: Record<string, unknown>;
    body: ResponseBody;
    cookies: Record<string, unknown>;
  };
  rule_tree: RuleTree | null;
  post_response_actions: unknown[] | null;
};

export type MockApiResponseInput = Omit<MockApiResponse, "id">;
