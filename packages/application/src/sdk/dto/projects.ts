import z from "zod";

const variable_name = z
  .string()
  .regex(/^[0-9a-z_]+$/)
  .max(32);

const array_variable_type = z.object({
  name: variable_name,
  type: z.literal("array"),
  value: z.union([z.string().array(), z.number().array(), z.boolean().array()]),
});

const string_variable_type = z.object({
  name: variable_name,
  type: z.literal("string"),
  value: z.string(),
});

const number_variable_type = z.object({
  name: variable_name,
  type: z.literal("number"),
  value: z.number(),
});

const boolean_variable_type = z.object({
  name: variable_name,
  type: z.literal("boolean"),
  value: z.boolean(),
});

const object_variable_type = z.object({
  name: variable_name,
  type: z.literal("object"),
  value: z.record(z.string(), z.any()),
});

const variable_types = z.discriminatedUnion("type", [
  array_variable_type,
  string_variable_type,
  number_variable_type,
  boolean_variable_type,
  object_variable_type,
]);

export const createProjectDto = z.object({
  name: z.string().max(64),
  description: z.string().max(255),
  globals: variable_types.array(),
  constants: variable_types.array(),
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
