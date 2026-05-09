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

const mockApiPredicateTargets = z.enum([
  "header",
  "query",
  "body",
  "path_param",
  "cookie",
  "url",
  "request_method",
]);

const mockApiNoModifierPredicateSchema = z.object({
  label: z.string(),
  type: z.literal("simple"),
  target: mockApiPredicateTargets,
  operator: z.enum([
    "null",
    "not_null",
    "empty_array",
    "not_empty_array",
    "valid_json_schema",
  ]),
  value: predicate_value,
});

const mockApiWithModifierPredicateSchema = z.object({
  label: z.string(),
  type: z.literal("simple"),
  target: z.enum([
    "header",
    "query",
    "body",
    "path_param",
    "cookie",
    "url",
    "request_method",
  ]),
  modifier: z.string(),
  operator: z.enum([
    "equals",
    "not_equals",
    "regex",
    "gt",
    "gte",
    "lt",
    "lte",
    "array_includes",
  ]),
  value: predicate_value,
});

const mockApiSimplePredicateSchema = z.discriminatedUnion("operator", [
  mockApiNoModifierPredicateSchema,
  mockApiWithModifierPredicateSchema,
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

type MockApiPredicate = z.infer<typeof mock_api_predicate>;

export type MockApiRuleNode = {
  label: string;
  type: "and" | "or";
  predicates: MockApiPredicate[];
  children: MockApiRuleNode[];
};

const mock_api_children: z.ZodType<MockApiRuleNode> = z.lazy(() =>
  z.object({
    label: z.string(),
    type: z.enum(["and", "or"]),
    predicates: z.array(mock_api_predicate),
    children: z.array(mock_api_children),
  }),
);

export const createMockApiRuleTreeDto = z.object({
  label: z.string(),
  type: z.enum(["or", "and"]),
  predicates: mock_api_predicate.array(),
  children: mock_api_children.array(),
});
