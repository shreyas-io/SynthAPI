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

const responseSchema = {
  type: "object",
  description: "Mock API response payload",
  properties: {
    status_code: { type: "number", description: "HTTP response status code" },
    headers: { type: "object", description: "Response headers", properties: {}, required: [] },
    body: { type: "object", description: "Response body", properties: {}, required: [] },
    cookies: { type: "object", description: "Response cookies", properties: {}, required: [] },
  },
  required: ["status_code", "headers", "body", "cookies"],
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
  list_mock_apis: toolEntry("list_mock_apis", "List mock APIs in the current project.", {
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
  }),
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
        is_default: { type: "boolean", description: "Whether this is the default response" },
        response: responseSchema,
        rule_tree: { type: "object", description: "Rule tree", properties: {}, required: [] },
        post_response_actions: {
          type: "array",
          description: "Post-response actions",
          items: { type: "object", description: "Action", properties: {}, required: [] },
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
        is_default: { type: "boolean", description: "Whether this is the default response" },
        response: responseSchema,
        rule_tree: { type: "object", description: "Rule tree", properties: {}, required: [] },
        post_response_actions: {
          type: "array",
          description: "Post-response actions",
          items: { type: "object", description: "Action", properties: {}, required: [] },
        },
      },
      required: ["response_id"],
    },
  ),
} satisfies Record<ToolKey, ToolDefinition>;
