import z from "zod";

const textMessageItemDto = z.object({
  type: z.literal("text"),
  source: z.object({
    type: z.literal("text"),
    text: z.string(),
  }),
});

const fileMessageItemDto = z.object({
  type: z.literal("file"),
  source: z.object({
    type: z.literal("blob_store"),
    id: z.uuidv7(),
  }),
});

export const chatTurnUserInputDto = z.array(
  z.discriminatedUnion("type", [textMessageItemDto, fileMessageItemDto]),
);
