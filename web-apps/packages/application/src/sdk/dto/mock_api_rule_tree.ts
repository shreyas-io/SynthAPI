import z from "zod";

const mock_api_simple_predicate = z.object({
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
    "request_rate",
    "request_interval_ms",
  ]),
  modifier: z.string(),
  operator: z.enum([
    "equals",
    "not_equals",
    "regex",
    "null",
    "not_null",
    "gt",
    "gte",
    "lt",
    "lte",
    "array_includes",
    "empty_array",
    "not_empty_array",
    "valid_json_schema",
  ]),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

const mock_api_custom_predicate = z.object({
  label: z.string(),
  type: z.literal("custom"),
  script: z.string(),
});

const mock_api_predicate = z.discriminatedUnion("type", [
  mock_api_custom_predicate,
  mock_api_simple_predicate,
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
