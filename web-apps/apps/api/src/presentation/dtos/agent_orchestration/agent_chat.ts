import z from "zod";
import { chatTurnUserInputDto } from "./chat_session_turns";

export const createChatTurnDto = z.object({
  user_input: chatTurnUserInputDto,
  mode: z.enum(["execution", "planning"]).default("execution"),
});

export const createProjectChatTurnDto = z.object({
  message: z.string().min(1),
  mode: z.enum(["execution", "planning"]).default("execution"),
});
