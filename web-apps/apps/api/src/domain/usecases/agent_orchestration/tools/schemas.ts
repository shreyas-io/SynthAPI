import { z } from "zod";
import { createMockApiResponseDto } from "../../../../presentation/dtos/mock_api/mock_api_response";
import {
  createMockApiDto,
  httpMethodDto,
  listMockApisFilterDto,
} from "../../../../presentation/dtos/mock_api";
import { variableTypesDto } from "../../../../presentation/dtos/mock_api/variables";

export const paginationDto = z.object({
  limit: z.number().min(0).max(100).default(20).describe("Maximum number of results"),
  offset: z.number().min(0).default(0).describe("Result offset"),
});

export const listProjectsToolInputDto = paginationDto;

export const emptyToolInputDto = z.object({});

export const updateProjectGlobalsToolInputDto = z.object({
  globals: z.array(variableTypesDto).describe("Global variables"),
});

export const updateProjectConstantsToolInputDto = z.object({
  constants: z.array(variableTypesDto).describe("Constant variables"),
});

export const listMockApisToolInputDto = listMockApisFilterDto
  .omit({
    ids: true,
    project_ids: true,
  })
  .merge(paginationDto);

export const getMockApiToolInputDto = z.object({
  mock_api_id: z.uuidv7().describe("Mock API ID"),
});

export const createMockApiToolInputDto = createMockApiDto.omit({
  project_id: true,
});

export const updateMockApiToolInputDto = getMockApiToolInputDto.extend({
  method: httpMethodDto.describe("HTTP method").optional(),
  path: z.string().max(4096).describe("API path").optional(),
  name: z.string().max(64).describe("Mock API name").optional(),
  description: z.string().max(255).nullable().describe("Description").optional(),
  variables: variableTypesDto
    .array()
    .describe("Mock API variables")
    .nullable()
    .optional(),
});

export const listMockApiResponsesToolInputDto = paginationDto.extend({
  mock_api_id: z.uuidv7().describe("Mock API ID"),
  name: z.string().describe("Response name filter").optional(),
});

export const getMockApiResponseToolInputDto = z.object({
  response_id: z.uuidv7().describe("Response ID"),
});

// Mirrors the REST createMockApiResponseDto so the agent path enforces the same
// nested `response`, typed rule_tree, and typed post_response_actions shapes.
export const createMockApiResponseToolInputDto = createMockApiResponseDto;

export const updateMockApiResponseToolInputDto = createMockApiResponseDto
  .partial()
  .extend({
    response_id: z.uuidv7().describe("Response ID"),
  });

export const reorderMockApiResponsesToolInputDto = z.object({
  mock_api_id: z.uuidv7().describe("Mock API ID"),
  response_ids: z.array(z.uuidv7()).describe("Array of response IDs in the new order"),
});

export const renderUiFormToolInputDto = z.object({
  question: z.string().describe("The question to ask the user"),
  options: z.array(z.string()).max(5).describe("List of options (max 5)").optional(),
});

export const webSearchToolInputDto = z.object({
  query: z.string().min(1).max(500).describe("Search query"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(5)
    .describe("Maximum number of results to return, from 1 to 5"),
});

export const webScrapeToolInputDto = z.object({
  url: z.url().describe("Public http or https URL to scrape"),
  max_chars: z
    .number()
    .int()
    .min(1000)
    .max(50000)
    .default(15000)
    .describe("Maximum markdown characters to return, from 1000 to 50000"),
});

// Single source of truth mapping a tool name to its input zod schema. Used both
// to build the LangChain tool validators and to derive the JSON schemas injected
// into the agent system prompt, so the two can never drift.
const toolInputDtoByName: Record<string, z.ZodTypeAny> = {
  list_projects: listProjectsToolInputDto,
  get_project: emptyToolInputDto,
  update_project_globals: updateProjectGlobalsToolInputDto,
  update_project_constants: updateProjectConstantsToolInputDto,
  list_mock_apis: listMockApisToolInputDto,
  get_mock_api: getMockApiToolInputDto,
  create_mock_api: createMockApiToolInputDto,
  update_mock_api: updateMockApiToolInputDto,
  list_mock_api_responses: listMockApiResponsesToolInputDto,
  get_mock_api_response: getMockApiResponseToolInputDto,
  create_mock_api_response: createMockApiResponseToolInputDto,
  update_mock_api_response: updateMockApiResponseToolInputDto,
  reorder_mock_api_responses: reorderMockApiResponsesToolInputDto,
  render_ui_form: renderUiFormToolInputDto,
  web_search: webSearchToolInputDto,
  web_scrape: webScrapeToolInputDto,
};

export const getToolInputDto = (name: string): z.ZodTypeAny =>
  toolInputDtoByName[name] ?? z.record(z.string(), z.any());
