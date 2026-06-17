import z from "zod";
import { chatTurnUserInputDto } from "./chat_session_turns";

export const createChatTurnDto = z.object({
  user_input: chatTurnUserInputDto,
});

export const createProjectChatTurnDto = z
  .object({
    message: z.string().optional(),
    files: z.array(z.object({ id: z.uuidv7() })).optional(),
  })
  .refine(
    (value) => Boolean(value.message?.trim() || value.files?.length),
    "Message or files are required.",
  );
