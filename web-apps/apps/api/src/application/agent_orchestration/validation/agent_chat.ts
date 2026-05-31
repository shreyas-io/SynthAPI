import z from "zod";

export const createChatTurnDto = z.object({
  user_input: z.array(
    z.discriminatedUnion("type", [
      z.object({
        type: z.literal("text"),
        source: z.object({
          type: z.literal("text"),
          text: z.string(),
        }),
      }),
      z.object({
        type: z.literal("file"),
        source: z.object({
          type: z.literal("blob_store"),
          id: z.uuidv7(),
        }),
      }),
    ]),
  ),
  mode: z.enum(["execution", "planning"]).default("execution"),
});
