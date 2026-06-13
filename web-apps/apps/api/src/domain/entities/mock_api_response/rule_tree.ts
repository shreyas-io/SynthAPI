type PredicateValue =
  | string
  | number
  | boolean
  | null
  | Record<string, any>
  | Array<any>;

type MockApiPredicateWithoutExpected = {
  label: string;
  type: "simple";
  actual: string; // {{request.headers.something}}
  operator:
    | "null"
    | "not_null"
    | "empty_array"
    | "not_empty_array"
    | "valid_json_schema"
    | "is_set"
    | "is_not_set"
    | "string_empty"
    | "string_not_empty";
};

type MockApiPredicateWithExpected = {
  label: string;
  type: "simple";
  actual: string; // {{request.headers.something}}
  operator:
    | "equals"
    | "not_equals"
    | "regex"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "array_includes"
    | "string_includes"
    | "string_not_includes"
    | "valid_json_schema";
  expected: PredicateValue;
};

type MockApiSimplePredicate =
  | MockApiPredicateWithoutExpected
  | MockApiPredicateWithExpected;

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
  children?: MockApiRuleTreeEt[];
};
