import z from "zod";

const globalValue = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.any()),
  z.record(z.string(), z.any()),
]);

const setGlobalAction = z.object({
  type: z.literal("set"),
  key: z.string().min(1),
  value: globalValue.optional(),
  value_template: z.string().optional(),
  order: z.number().int(),
});

const unsetGlobalAction = z.object({
  type: z.literal("unset"),
  key: z.string().min(1),
  order: z.number().int(),
});

const incrementGlobalAction = z.object({
  type: z.literal("increment"),
  key: z.string().min(1),
  amount: z.number().default(1),
  order: z.number().int(),
});

const decrementGlobalAction = z.object({
  type: z.literal("decrement"),
  key: z.string().min(1),
  amount: z.number().default(1),
  order: z.number().int(),
});

const appendGlobalAction = z.object({
  type: z.literal("append"),
  key: z.string().min(1),
  value: globalValue.optional(),
  value_template: z.string().optional(),
  order: z.number().int(),
});

const removeFromGlobalAction = z.object({
  type: z.literal("remove"),
  key: z.string().min(1),
  value: globalValue.optional(),
  value_template: z.string().optional(),
  order: z.number().int(),
});

const scriptPostResponseAction = z.object({
  type: z.literal("script"),
  language: z.literal("python"),
  code: z.string().min(1),
  order: z.number().int(),
});

export const mockApiPostResponseAction = z.discriminatedUnion("type", [
  setGlobalAction,
  unsetGlobalAction,
  incrementGlobalAction,
  decrementGlobalAction,
  appendGlobalAction,
  removeFromGlobalAction,
  scriptPostResponseAction,
]);
