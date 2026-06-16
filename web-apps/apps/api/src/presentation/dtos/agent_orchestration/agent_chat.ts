import z from "zod";
import { chatTurnUserInputDto } from "./chat_session_turns";

export const createChatTurnDto = z.object({
  user_input: chatTurnUserInputDto,
});

export const createProjectChatTurnDto = z.object({
  message: z.string().min(1),
});
