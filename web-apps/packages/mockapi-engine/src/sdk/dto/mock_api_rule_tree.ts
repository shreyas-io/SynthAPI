import z from "zod";

const predicate_value: z.ZodType<
  string | number | boolean | null | Record<string, any> | Array<any>
> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.record(z.string(), z.any()),
    z.array(z.any()),
  ]),
);

type MockApiPredicateValue =
  | string
  | number
  | boolean
  | null
  | Record<string, any>
  | Array<any>;

type MockApiPredicateWithoutExpected = {
  label: string;
  type: "simple";
  actual: string;
  operator:
    | "null"
    | "not_null"
    | "empty_array"
    | "not_empty_array"
    | "is_set"
    | "is_not_set"
    | "string_empty"
    | "string_not_empty";
};

type MockApiPredicateWithExpected = {
  label: string;
  type: "simple";
  actual: string;
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
  expected: MockApiPredicateValue;
};

type MockApiCustomPredicate = {
  label: string;
  type: "custom";
  script: string;
};

type MockApiPredicate =
  | MockApiCustomPredicate
  | MockApiPredicateWithoutExpected
  | MockApiPredicateWithExpected;

export type MockApiRuleNode = {
  label: string;
  type: "and" | "or";
  predicates: MockApiPredicate[];
  children: MockApiRuleNode[];
};

const mock_api_rule_node: z.ZodType<MockApiRuleNode> = z.lazy(() => {
  const mockApiPredicateWithoutExpectedSchema = z.object({
    label: z.string(),
    type: z.literal("simple"),
    actual: z.string(),
    operator: z.enum([
      "null",
      "not_null",
      "empty_array",
      "not_empty_array",
      "is_set",
      "is_not_set",
      "string_empty",
      "string_not_empty",
    ]),
  });

  const mockApiPredicateWithExpectedSchema = z.object({
    label: z.string(),
    type: z.literal("simple"),
    actual: z.string(),
    operator: z.enum([
      "equals",
      "not_equals",
      "regex",
      "gt",
      "gte",
      "lt",
      "lte",
      "array_includes",
      "string_includes",
      "string_not_includes",
      "valid_json_schema",
    ]),
    expected: predicate_value,
  });

  const mockApiSimplePredicateSchema = z.discriminatedUnion("operator", [
    mockApiPredicateWithoutExpectedSchema,
    mockApiPredicateWithExpectedSchema,
  ]);

  const mock_api_custom_predicate = z.object({
    label: z.string(),
    type: z.literal("custom"),
    script: z.string(),
  });

  const mock_api_predicate = z.discriminatedUnion("type", [
    mock_api_custom_predicate,
    mockApiSimplePredicateSchema,
  ]);

  return z.object({
    label: z.string(),
    type: z.enum(["and", "or"]),
    predicates: z.array(mock_api_predicate),
    children: z.array(mock_api_rule_node),
  });
});

export const createMockApiRuleTreeDto = mock_api_rule_node;
