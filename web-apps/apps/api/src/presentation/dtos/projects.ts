import z from "zod";
import { variableTypesDto } from "./mock_api/variables";

export const createProjectDto = z.object({
  name: z.string().max(64),
  description: z.string().max(255),
  organization_id: z.uuidv7(),
  globals: variableTypesDto.array().optional(),
  constants: variableTypesDto.array().optional(),
});

export const listProjectsFilterDto = z.object({
  ids: z.uuidv7().array().optional(),
  organization_id: z.uuidv7(),
  slug: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
});

export const listProjectsPaginationDto = z.object({
  limit: z.number().min(0).max(100),
  offset: z.number().min(0),
});

export const listProjectsSortDto = z.object({
  by: z.enum(["name", "created_at"]),
  order: z.enum(["asc", "desc"]),
});
