import z from "zod";

const variable_name = z.string().regex(/^[0-9a-z_]+$/);

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

export const create_project_dto = z.object({
  name: z.string(),
  description: z.string(),
  globals: variable_types.array(),
  constants: variable_types.array(),
});
