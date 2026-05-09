import z from "zod";

const variableScope = z.enum(["global", "local"]);

const variableValue = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.any()),
  z.record(z.string(), z.any()),
]);

const setVariableAction = z.object({
  type: z.literal("set"),
  scope: variableScope,
  key: z.string().min(1),
  value: variableValue,
  order: z.number().int(),
});

const unsetVariableAction = z.object({
  type: z.literal("unset"),
  scope: variableScope,
  key: z.string().min(1),
  order: z.number().int(),
});

const incrementVariableAction = z.object({
  type: z.literal("increment"),
  scope: variableScope,
  key: z.string().min(1),
  amount: z.number().default(1),
  order: z.number().int(),
});

const decrementVariableAction = z.object({
  type: z.literal("decrement"),
  scope: variableScope,
  key: z.string().min(1),
  amount: z.number().default(1),
  order: z.number().int(),
});

const appendVariableAction = z.object({
  type: z.literal("append"),
  scope: variableScope,
  key: z.string().min(1),
  value: variableValue,
  order: z.number().int(),
});

const removeFromVariableAction = z.object({
  type: z.literal("remove"),
  scope: variableScope,
  key: z.string().min(1),
  value: variableValue,
  order: z.number().int(),
});

const scriptPostResponseAction = z.object({
  type: z.literal("script"),
  language: z.literal("python"),
  code: z.string().min(1),
  order: z.number().int(),
});

export const mockApiPostResponseAction = z.discriminatedUnion("type", [
  setVariableAction,
  unsetVariableAction,
  incrementVariableAction,
  decrementVariableAction,
  appendVariableAction,
  removeFromVariableAction,
  scriptPostResponseAction,
]);
