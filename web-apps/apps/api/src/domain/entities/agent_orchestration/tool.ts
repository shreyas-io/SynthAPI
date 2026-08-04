import { z } from "zod";
import { toolKeys } from "./tool_keys";

type _ToolParameter =
  | { type: "string"; description: string }
  | { type: "number"; description: string }
  | { type: "boolean"; description: string }
  | { type: string; description: string; enum?: string[] }
  | { type: "array"; description: string; items: _ToolParameter }
  | { type: "object"; description: string; properties: Record<string, _ToolParameter>; required: string[] };

export const toolParameterSchema: z.ZodType<_ToolParameter> = z.lazy(() =>
  z.union([
    z.object({ type: z.literal("string"), description: z.string() }),
    z.object({ type: z.literal("number"), description: z.string() }),
    z.object({ type: z.literal("boolean"), description: z.string() }),
    z.object({ type: z.string(), description: z.string(), enum: z.array(z.string()).optional() }),
    z.object({
      type: z.literal("array"),
      description: z.string(),
      items: z.lazy(() => toolParameterSchema),
    }),
    z.object({
      type: z.literal("object"),
      description: z.string(),
      properties: z.record(z.string(), z.lazy(() => toolParameterSchema)),
      required: z.array(z.string()),
    }),
  ]),
);

export type ToolParameter = z.infer<typeof toolParameterSchema>;
export type ObjectParameters = Extract<ToolParameter, { type: "object" }>;

export const toolDefinitionSchema = z.object({
  name: z.enum(toolKeys),
  description: z.string(),
  input_schema: z.object({
    type: z.literal("object"),
    description: z.string(),
    properties: z.record(z.string(), toolParameterSchema),
    required: z.array(z.string()),
  }),
});

export type ToolDefinition = z.infer<typeof toolDefinitionSchema>;
