type PredicateValue =
  | string
  | number
  | boolean
  | null
  | Record<string, any>
  | Array<any>;

type MockApiNoModifierPredicate = {
  label: string;
  type: "simple";
  operator:
    | "null"
    | "not_null"
    | "empty_array"
    | "not_empty_array"
    | "valid_json_schema";
  value: PredicateValue;
};

type MockApiWithModifierPredicate = {
  label: string;
  type: "simple";
  modifier: string; // {{request.headers.something}}
  operator:
    | "equals"
    | "not_equals"
    | "regex"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "array_includes";
  value: PredicateValue;
};

type MockApiSimplePredicate =
  | MockApiNoModifierPredicate
  | MockApiWithModifierPredicate;

type MockApiCustomPredicate = {
  label: string;
  type: "custom";
  script: string;
};

export type MockApiPredicateEt =
  | MockApiCustomPredicate
  | MockApiSimplePredicate;

export type MockApiRuleTreeEt = {
  label: string;
  type: "and" | "or";
  predicates: MockApiPredicateEt[];
  children: MockApiRuleTreeEt[];
};
