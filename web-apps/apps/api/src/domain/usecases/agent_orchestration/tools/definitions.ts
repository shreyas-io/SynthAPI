import type { ToolDefinition } from "../../../entities/agent_orchestration/tool";
import type { ToolKey } from "../../../entities/agent_orchestration/tool_keys";

export const toolEntry = (
  name: ToolKey,
  description: string,
  input_schema: ToolDefinition["input_schema"],
): ToolDefinition => ({
  name,
  description,
  input_schema,
});

const variableSchema = {
  type: "object",
  description: "A variable",
  properties: {
    name: { type: "string", description: "Variable name" },
    type: { type: "string", description: "Variable type" },
    value: { type: "any", description: "Variable value" },
  },
  required: ["name", "type", "value"],
} as const;

// The full response object, nested under the `response` key. This mirrors the
// REST createMockApiResponseDto shape and the system prompt instructions.
const responseObjectSchema = {
  type: "object",
  description:
    "The full response object. Always provide all four fields together.",
  properties: {
    status_code: { type: "number", description: "HTTP response status code" },
    headers: {
      type: "object",
      description: "Response headers object, e.g. { \"content-type\": \"application/json\" }",
    },
    cookies: {
      type: "object",
      description: "Response cookies object",
    },
    body: {
      type: "object",
      description:
        "Response body. Use { \"type\": \"json\", \"value\": ... }, { \"type\": \"text\", \"value\": \"...\" }, { \"type\": \"empty\" }, { \"type\": \"json_script\", \"code\": \"...\" }, or an SSE object { \"type\": \"sse\", ... }.",
    },
  },
  required: ["status_code", "headers", "body", "cookies"],
} as const;

// A rule tree predicate. Mirrors the predicate shapes in createMockApiRuleTreeDto
// (now strict). Enums match the engine exactly.
const ruleTreePredicateSchema = {
  type: "object",
  description:
    "A rule tree predicate. `simple` predicates compare `actual` using `operator` (and `expected` when the operator requires it). `custom` predicates run a Python `script` that returns a boolean and may only read execution_context.",
  properties: {
    label: { type: "string", description: "Predicate label" },
    type: {
      type: "string",
      description: "Predicate type",
      enum: ["simple", "custom"],
    },
    actual: {
      type: "string",
      description:
        "Template evaluated against the request, e.g. {{request.headers.authorization}}. Required for simple predicates.",
    },
    operator: {
      type: "string",
      description: "Comparison operator for simple predicates.",
      enum: [
        "null",
        "not_null",
        "empty_array",
        "not_empty_array",
        "is_set",
        "is_not_set",
        "string_empty",
        "string_not_empty",
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
      ],
    },
    expected: {
      type: "string",
      description:
        "Expected value, required only for operators that need it (equals, not_equals, regex, gt, gte, lt, lte, array_includes, string_includes, string_not_includes, valid_json_schema).",
    },
    script: {
      type: "string",
      description: "Python script returning a boolean. Custom predicates only.",
    },
  },
  required: ["label", "type"],
} as const;

// A rule tree node. Mirrors createMockApiRuleTreeDto (now strict).
const ruleTreeNodeSchema = {
  type: "object",
  description:
    "A rule tree node used for conditional responses. `and` requires every predicate and child to pass; `or` requires any to pass.",
  properties: {
    label: { type: "string", description: "Node label" },
    type: {
      type: "string",
      description: "Node combinator",
      enum: ["and", "or"],
    },
    predicates: {
      type: "array",
      description: "Predicates evaluated for this node",
      items: ruleTreePredicateSchema,
    },
    children: {
      type: "array",
      description: "Child rule nodes; each has the same shape as this node",
      items: {
        type: "object",
        description: "Child rule node (same shape as the parent node)",
      },
    },
  },
  required: ["label", "type", "predicates"],
} as const;

export const toolDefinitions = {
  list_projects: toolEntry("list_projects", "List projects.", {
    type: "object",
    description: "Pagination input",
    properties: {
      limit: { type: "number", description: "Maximum number of results" },
      offset: { type: "number", description: "Result offset" },
    },
    required: [],
  }),
  get_project: toolEntry("get_project", "Get the current project.", {
    type: "object",
    description: "No input required",
    properties: {},
    required: [],
  }),
  update_project_globals: toolEntry(
    "update_project_globals",
    "Update global variables for the current project.",
    {
      type: "object",
      description: "Project globals input",
      properties: {
        globals: {
          type: "array",
          description: "Global variables",
          items: variableSchema,
        },
      },
      required: ["globals"],
    },
  ),
  update_project_constants: toolEntry(
    "update_project_constants",
    "Update constant variables for the current project.",
    {
      type: "object",
      description: "Project constants input",
      properties: {
        constants: {
          type: "array",
          description: "Constant variables",
          items: variableSchema,
        },
      },
      required: ["constants"],
    },
  ),
  list_mock_apis: toolEntry(
    "list_mock_apis",
    "List mock APIs in the current project.",
    {
      type: "object",
      description: "Mock API filters",
      properties: {
        method: { type: "string", description: "HTTP method filter" },
        path: { type: "string", description: "Path filter" },
        name: { type: "string", description: "Name filter" },
        description: { type: "string", description: "Description filter" },
        limit: { type: "number", description: "Maximum number of results" },
        offset: { type: "number", description: "Result offset" },
      },
      required: [],
    },
  ),
  get_mock_api: toolEntry("get_mock_api", "Get a mock API by ID.", {
    type: "object",
    description: "Mock API lookup input",
    properties: {
      mock_api_id: { type: "string", description: "Mock API ID" },
    },
    required: ["mock_api_id"],
  }),
  create_mock_api: toolEntry("create_mock_api", "Create a mock API.", {
    type: "object",
    description: "Mock API creation input",
    properties: {
      method: { type: "string", description: "HTTP method" },
      path: { type: "string", description: "API path" },
      name: { type: "string", description: "Mock API name" },
      description: { type: "string", description: "Description" },
      variables: {
        type: "array",
        description: "Mock API variables",
        items: variableSchema,
      },
    },
    required: ["method", "path", "name"],
  }),
  update_mock_api: toolEntry("update_mock_api", "Update a mock API.", {
    type: "object",
    description: "Mock API update input",
    properties: {
      mock_api_id: { type: "string", description: "Mock API ID" },
      method: { type: "string", description: "HTTP method" },
      path: { type: "string", description: "API path" },
      name: { type: "string", description: "Mock API name" },
      description: { type: "string", description: "Description" },
      variables: {
        type: "array",
        description: "Mock API variables",
        items: variableSchema,
      },
    },
    required: ["mock_api_id"],
  }),
  list_mock_api_responses: toolEntry(
    "list_mock_api_responses",
    "List responses for a mock API.",
    {
      type: "object",
      description: "Mock API response filters",
      properties: {
        mock_api_id: { type: "string", description: "Mock API ID" },
        name: { type: "string", description: "Response name filter" },
        limit: { type: "number", description: "Maximum number of results" },
        offset: { type: "number", description: "Result offset" },
      },
      required: ["mock_api_id"],
    },
  ),
  get_mock_api_response: toolEntry(
    "get_mock_api_response",
    "Get a mock API response by ID.",
    {
      type: "object",
      description: "Mock API response lookup input",
      properties: {
        response_id: { type: "string", description: "Response ID" },
      },
      required: ["response_id"],
    },
  ),
  create_mock_api_response: toolEntry(
    "create_mock_api_response",
    "Create a mock API response.",
    {
      type: "object",
      description: "Mock API response creation input",
      properties: {
        mock_api_id: { type: "string", description: "Mock API ID" },
        name: { type: "string", description: "Response name" },
        is_default: {
          type: "boolean",
          description: "Whether this is the default response",
        },
        response: responseObjectSchema,
        rule_tree: ruleTreeNodeSchema,
        post_response_actions: {
          type: "array",
          description: "Optional post-response actions",
          items: { type: "object", description: "Action" },
        },
      },
      required: ["mock_api_id", "name", "response"],
    },
  ),
  update_mock_api_response: toolEntry(
    "update_mock_api_response",
    "Update a mock API response.",
    {
      type: "object",
      description: "Mock API response update input",
      properties: {
        response_id: { type: "string", description: "Response ID" },
        name: { type: "string", description: "Response name" },
        is_default: {
          type: "boolean",
          description: "Whether this is the default response",
        },
        response: responseObjectSchema,
        rule_tree: ruleTreeNodeSchema,
        post_response_actions: {
          type: "array",
          description: "Optional post-response actions",
          items: { type: "object", description: "Action" },
        },
      },
      required: ["response_id"],
    },
  ),
  reorder_mock_api_responses: toolEntry(
    "reorder_mock_api_responses",
    "Reorder the execution order of mock API responses. The array of response IDs must contain all non-default responses for the given mock API in the new desired order.",
    {
      type: "object",
      description: "Mock API response reorder input",
      properties: {
        mock_api_id: { type: "string", description: "Mock API ID" },
        response_ids: {
          type: "array",
          description: "Array of response IDs in the new order",
          items: { type: "string", description: "Response ID" },
        },
      },
      required: ["mock_api_id", "response_ids"],
    },
  ),
  render_ui_form: toolEntry(
    "render_ui_form",
    "Render a form on the UI to ask the user a question with multiple options.",
    {
      type: "object",
      description: "Form rendering input",
      properties: {
        question: {
          type: "string",
          description: "The question to ask the user",
        },
        options: {
          type: "array",
          description: "List of options (max 5)",
          items: { type: "string", description: "Option label" },
        },
      },
      required: ["question"],
    },
  ),
  web_search: toolEntry(
    "web_search",
    "Search the public web for relevant pages (maximum 5 calls per turn).",
    {
      type: "object",
      description: "Web search input",
      properties: {
        query: { type: "string", description: "Search query" },
        limit: {
          type: "number",
          description: "Maximum number of results to return, from 1 to 5",
        },
      },
      required: ["query"],
    },
  ),
  web_scrape: toolEntry(
    "web_scrape",
    "Fetch a public webpage by URL and return a best-effort Markdown representation of the HTML content.",
    {
      type: "object",
      description: "Web scrape input",
      properties: {
        url: {
          type: "string",
          description: "Public http or https URL to scrape",
        },
        max_chars: {
          type: "number",
          description:
            "Maximum markdown characters to return, from 1000 to 50000",
        },
      },
      required: ["url"],
    },
  ),
} satisfies Record<ToolKey, ToolDefinition>;
