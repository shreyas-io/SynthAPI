import type { ToolDefinition } from "../../domain/entities/tool";
import type { ToolKey } from "../../domain/entities/tool_keys";

const toolEntry = (
  name: ToolKey,
  description: string,
  input_schema: ToolDefinition["input_schema"],
): ToolDefinition => ({
  name,
  description,
  input_schema,
});

const ToolsRegistry: Record<ToolKey, ToolDefinition> = {
  // ── Projects (read-only) ───────────────────────────────────────────

  list_projects: toolEntry("list_projects", "List all projects", {
    type: "object",
    description: "Provide the parameters for paginating the response",
    properties: {
      limit: {
        type: "number",
        description: "Maximum number of results (default 20)",
      },
      offset: {
        type: "number",
        description: "Result offset for pagination (default 0)",
      },
    },
    required: [],
  }),
  get_project: toolEntry(
    "get_project",
    "Get details of a specific project by ID.",
    {
      type: "object",
      description: "",
      properties: {
        project_id: { type: "string", description: "The project ID" },
      },
      required: ["project_id"],
    },
  ),

  // ── Projects (read-write) ────────────────────────────────────────

  update_project_globals: toolEntry(
    "update_project_globals",
    "Update the global variables of a project.",
    {
      type: "object",
      description: "",
      properties: {
        project_id: { type: "string", description: "The project ID" },
        globals: {
          type: "array",
          description: "List of global variables to set",
          items: {
            type: "object",
            description: "A project variable",
            properties: {
              name: { type: "string", description: "Variable name" },
              type: {
                type: "string",
                description: "Variable type",
              },
              value: {
                type: "string",
                description:
                  "The variable value. Use string for 'string', number for 'number', boolean for 'boolean', array for 'array', object for 'object'.",
              },
            },
            required: ["name", "type", "value"],
          },
        },
      },
      required: ["project_id", "globals"],
    },
  ),
  update_project_constants: toolEntry(
    "update_project_constants",
    "Update the constant variables of a project.",
    {
      type: "object",
      description: "",
      properties: {
        project_id: { type: "string", description: "The project ID" },
        constants: {
          type: "array",
          description: "List of constant variables to set",
          items: {
            type: "object",
            description: "A project variable",
            properties: {
              name: { type: "string", description: "Variable name" },
              type: {
                type: "string",
                description: "Variable type",
              },
              value: {
                type: "string",
                description:
                  "The variable value. Use string for 'string', number for 'number', boolean for 'boolean', array for 'array', object for 'object'.",
              },
            },
            required: ["name", "type", "value"],
          },
        },
      },
      required: ["project_id", "constants"],
    },
  ),

  // ── Mock APIs (read-only) ──────────────────────────────────────────

  list_mock_apis: toolEntry("list_mock_apis", "List mock APIs in a project.", {
    type: "object",
    description: "",
    properties: {
      project_id: { type: "string", description: "The project ID" },
      method: {
        type: "string",
        description: "HTTP method filter",
      },
      path: { type: "string", description: "Path filter (partial match)" },
      name: { type: "string", description: "Name filter (partial match)" },
      description: {
        type: "string",
        description: "Description filter (partial match)",
      },
      limit: {
        type: "number",
        description: "Maximum number of results (default 20)",
      },
      offset: {
        type: "number",
        description: "Result offset for pagination (default 0)",
      },
    },
    required: ["project_id"],
  }),
  get_mock_api: toolEntry("get_mock_api", "Get a specific mock API by ID.", {
    type: "object",
    description: "",
    properties: {
      mock_api_id: { type: "string", description: "The mock API ID" },
    },
    required: ["mock_api_id"],
  }),

  // ── Mock APIs (read-write) ───────────────────────────────────────

  create_mock_api: toolEntry(
    "create_mock_api",
    "Create a new mock API in a project.",
    {
      type: "object",
      description: "",
      properties: {
        project_id: { type: "string", description: "The project ID" },
        method: {
          type: "string",
          description: "HTTP method",
        },
        path: {
          type: "string",
          description: "API path, e.g. /users/:id",
        },
        name: { type: "string", description: "Name of the mock API" },
        description: {
          type: "string",
          description: "Optional description",
        },
        variables: {
          type: "array",
          description: "Optional mock API variables",
          items: {
            type: "object",
            description: "A mock API variable",
            properties: {
              name: { type: "string", description: "Variable name" },
              type: {
                type: "string",
                description: "Variable type",
              },
              value: {
                type: "string",
                description:
                  "The variable value. Use string for 'string', number for 'number', boolean for 'boolean', array for 'array', object for 'object'.",
              },
            },
            required: ["name", "type", "value"],
          },
        },
      },
      required: ["project_id", "method", "path", "name"],
    },
  ),
  update_mock_api: toolEntry(
    "update_mock_api",
    "Update an existing mock API.",
    {
      type: "object",
      description: "",
      properties: {
        mock_api_id: { type: "string", description: "The mock API ID" },
        method: {
          type: "string",
          description: "HTTP method",
        },
        path: { type: "string", description: "API path" },
        name: { type: "string", description: "Name of the mock API" },
        description: {
          type: "string",
          description: "Optional description",
        },
        variables: {
          type: "array",
          description: "Optional mock API variables",
          items: {
            type: "object",
            description: "A mock API variable",
            properties: {
              name: { type: "string", description: "Variable name" },
              type: {
                type: "string",
                description: "Variable type",
              },
              value: {
                type: "string",
                description:
                  "The variable value. Use string for 'string', number for 'number', boolean for 'boolean', array for 'array', object for 'object'.",
              },
            },
            required: ["name", "type", "value"],
          },
        },
      },
      required: ["mock_api_id", "method", "path", "name"],
    },
  ),
  delete_mock_api: toolEntry("delete_mock_api", "Delete a mock API.", {
    type: "object",
    description: "",
    properties: {
      mock_api_id: { type: "string", description: "The mock API ID" },
    },
    required: ["mock_api_id"],
  }),

  // ── Mock API Responses (read-only) ─────────────────────────────────

  list_mock_api_responses: toolEntry(
    "list_mock_api_responses",
    "List responses for a mock API.",
    {
      type: "object",
      description: "",
      properties: {
        mock_api_id: { type: "string", description: "The mock API ID" },
        limit: {
          type: "number",
          description: "Maximum number of results (default 20)",
        },
        offset: {
          type: "number",
          description: "Result offset for pagination (default 0)",
        },
      },
      required: ["mock_api_id"],
    },
  ),
  get_mock_api_response: toolEntry(
    "get_mock_api_response",
    "Get a specific mock API response by ID.",
    {
      type: "object",
      description: "",
      properties: {
        response_id: { type: "string", description: "The response ID" },
      },
      required: ["response_id"],
    },
  ),

  // ── Mock API Responses (read-write) ────────────────────────────────

  create_mock_api_response: toolEntry(
    "create_mock_api_response",
    "Create a new response for a mock API.",
    {
      type: "object",
      description: "",
      properties: {
        mock_api_id: { type: "string", description: "The mock API ID" },
        rule_tree: {
          type: "object",
          description:
            "Optional rule tree configuration. See API docs for schema.",
          properties: {},
          required: [],
        },
        post_response_actions: {
          type: "array",
          description:
            "Optional post-response actions. See API docs for schema.",
          items: {
            type: "object",
            description: "A post-response action",
            properties: {},
            required: [],
          },
        },
      },
      required: ["mock_api_id"],
    },
  ),
  update_mock_api_response: toolEntry(
    "update_mock_api_response",
    "Update an existing mock API response.",
    {
      type: "object",
      description: "",
      properties: {
        response_id: { type: "string", description: "The response ID" },
        rule_tree: {
          type: "object",
          description:
            "Optional rule tree configuration. See API docs for schema.",
          properties: {},
          required: [],
        },
        post_response_actions: {
          type: "array",
          description:
            "Optional post-response actions. See API docs for schema.",
          items: {
            type: "object",
            description: "A post-response action",
            properties: {},
            required: [],
          },
        },
      },
      required: ["response_id"],
    },
  ),
  delete_mock_api_response: toolEntry(
    "delete_mock_api_response",
    "Delete a mock API response.",
    {
      type: "object",
      description: "",
      properties: {
        response_id: { type: "string", description: "The response ID" },
      },
      required: ["response_id"],
    },
  ),
};

export const ToolRegistry = () => ({
  getAllTools(): ToolDefinition[] {
    return Object.values(ToolsRegistry);
  },

  getToolByName(name: ToolKey): ToolDefinition | undefined {
    return ToolsRegistry[name];
  },
});
