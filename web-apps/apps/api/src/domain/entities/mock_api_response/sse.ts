import { z } from "zod";

const sseDataSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.any()),
  z.record(z.string(), z.any()),
]);

export const sseEventSchema = z.object({
  data: sseDataSchema,
  event: z.string().min(1).optional(),
  id: z.string().min(1).optional(),
  retry_ms: z.number().int().min(0).optional(),
});

export const sseStreamItemSchema = z.object({
  delay_ms: z.number().int().min(0).optional(),
  sse: sseEventSchema,
});

export const sseStreamItemsSchema = z.array(sseStreamItemSchema);

export const sseEventsBodySchema = z.object({
  type: z.literal("sse"),
  mode: z.literal("events"),
  events: sseStreamItemsSchema,
});

export const sseScriptBodySchema = z.object({
  type: z.literal("sse"),
  mode: z.literal("script"),
  code: z.string().min(1),
});

export const sseBodySchema = z.discriminatedUnion("mode", [
  sseEventsBodySchema,
  sseScriptBodySchema,
]);

export type SseEventEt = z.infer<typeof sseEventSchema>;
export type SseStreamItemEt = z.infer<typeof sseStreamItemSchema>;
export type SseEventsBodyEt = z.infer<typeof sseEventsBodySchema>;
export type SseScriptBodyEt = z.infer<typeof sseScriptBodySchema>;
export type SseBodyEt = z.infer<typeof sseBodySchema>;
