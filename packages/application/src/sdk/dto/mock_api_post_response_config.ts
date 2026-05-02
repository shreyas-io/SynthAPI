import { z } from "zod";

const global_value = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.any()),
  z.record(z.string(), z.any()),
]);

const set_global_action = z.object({
  type: z.literal("set_global"),
  key: z.string().min(1),
  value: global_value.optional(),
  value_template: z.string().optional(),
});

const unset_global_action = z.object({
  type: z.literal("unset_global"),
  key: z.string().min(1),
});

const increment_global_action = z.object({
  type: z.literal("increment_global"),
  key: z.string().min(1),
  amount: z.number().default(1),
});

const decrement_global_action = z.object({
  type: z.literal("decrement_global"),
  key: z.string().min(1),
  amount: z.number().default(1),
});

const append_global_action = z.object({
  type: z.literal("append_global"),
  key: z.string().min(1),
  value: global_value.optional(),
  value_template: z.string().optional(),
});

const remove_from_global_action = z.object({
  type: z.literal("remove_from_global"),
  key: z.string().min(1),
  value: global_value.optional(),
  value_template: z.string().optional(),
});

const script_post_response_action = z.object({
  type: z.literal("script"),
  language: z.literal("python"),
  code: z.string().min(1),
});

export const mock_api_post_response_action = z.discriminatedUnion("type", [
  set_global_action,
  unset_global_action,
  increment_global_action,
  decrement_global_action,
  append_global_action,
  remove_from_global_action,
  script_post_response_action,
]);

export const mock_api_post_response = z.object({
  actions: z.array(mock_api_post_response_action).default([]),
});
