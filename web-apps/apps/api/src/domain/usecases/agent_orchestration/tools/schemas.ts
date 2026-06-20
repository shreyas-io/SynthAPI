import { z } from "zod";
import { createMockApiResponseDto } from "../../../../presentation/dtos/mock_api/mock_api_response";
import {
  createMockApiDto,
  listMockApisFilterDto,
} from "../../../../presentation/dtos/mock_api";

const variableDto = z.object({
  name: z.string(),
  type: z.enum(["string", "number", "boolean", "array", "object"]),
  value: z.unknown(),
});

export const paginationDto = z.object({
  limit: z.number().min(0).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export const listProjectsToolInputDto = paginationDto;

export const emptyToolInputDto = z.object({});

export const updateProjectGlobalsToolInputDto = z.object({
  globals: z.array(variableDto),
});

export const updateProjectConstantsToolInputDto = z.object({
  constants: z.array(variableDto),
});

export const listMockApisToolInputDto = listMockApisFilterDto
  .omit({
    ids: true,
    project_ids: true,
  })
  .merge(paginationDto);

export const getMockApiToolInputDto = z.object({
  mock_api_id: z.uuidv7(),
});

export const createMockApiToolInputDto = createMockApiDto.omit({
  project_id: true,
});

export const updateMockApiToolInputDto = getMockApiToolInputDto.extend({
  method: z
    .enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"])
    .optional(),
  path: z.string().optional(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  variables: z.array(variableDto).nullable().optional(),
});

export const listMockApiResponsesToolInputDto = paginationDto.extend({
  mock_api_id: z.uuidv7(),
  name: z.string().optional(),
});

export const getMockApiResponseToolInputDto = z.object({
  response_id: z.uuidv7(),
});

export const createMockApiResponseToolInputDto = createMockApiResponseDto;

export const updateMockApiResponseToolInputDto = createMockApiResponseDto
  .partial()
  .extend({
    response_id: z.uuidv7(),
  });

export const reorderMockApiResponsesToolInputDto = z.object({
  mock_api_id: z.uuidv7(),
  response_ids: z.array(z.uuidv7()),
});

export const renderUiFormToolInputDto = z.object({
  question: z.string(),
  options: z.array(z.string()).max(5).optional(),
});

export const webSearchToolInputDto = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(10).default(5),
  search_depth: z.enum(["basic", "advanced"]).default("basic"),
  topic: z.enum(["general", "news", "finance"]).default("general"),
  include_answer: z.boolean().default(false),
});

export const webScrapeToolInputDto = z.object({
  url: z.url(),
  max_chars: z.number().int().min(1000).max(50000).default(15000),
});
