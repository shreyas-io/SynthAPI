import z from "zod";
import { variable_types } from "./variables";

export const createProjectDto = z.object({
  name: z.string().max(64),
  description: z.string().max(255),
  globals: variable_types.array().optional(),
  constants: variable_types.array().optional(),
});

export const listProjectsFilterDto = z.object({
  ids: z.uuidv7().array().optional(),
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
