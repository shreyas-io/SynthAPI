type MockApiSimplePredicate = {
  key: string;
  label: string;
  type: "simple";
  target:
    | "header"
    | "query"
    | "body"
    | "path_param"
    | "cookie"
    | "url"
    | "request_method"
    | "request_rate"
    | "request_interval_ms";
  modifier: string;
  operator:
    | "equals"
    | "not_equals"
    | "regex"
    | "null"
    | "not_null"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "array_includes"
    | "empty_array"
    | "not_empty_array"
    | "valid_json_schema";
  value: string | number | boolean;
};

type MockApiCustomPredicate = {
  key: string;
  label: string;
  type: "custom";
  script: string;
};

export type MockApiPredicateEt =
  | MockApiCustomPredicate
  | MockApiSimplePredicate;

export type MockApiRuleTreeEt = {
  key: string;
  label: string;
  type: "and" | "or";
  predicates: MockApiPredicateEt[];
  children: MockApiRuleTreeEt[];
};
