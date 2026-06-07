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

export const listMockApisToolInputDto = listMockApisFilterDto.omit({
  ids: true,
  project_ids: true,
});

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

export const updateMockApiResponseToolInputDto = createMockApiResponseDto;
