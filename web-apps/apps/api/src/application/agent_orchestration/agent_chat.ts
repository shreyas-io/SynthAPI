import { AgentOrchestrationException } from "../../domain/exceptions/exception";
import { AgentChatUsecase } from "../../domain/usecases/agent_orchestration/agent_chat";
import type { AppContext } from "./context";
import { createChatTurnDto } from "./validation/agent_chat";

export function AgentChatApplication(ctx: AppContext) {
  const agent_chat = AgentChatUsecase(ctx);

  return {
    createChatTurn: async (chat_session_id: string, data: unknown) => {
      const { data: input, success, error } = createChatTurnDto.safeParse(data);

      if (!success) {
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(error.issues),
        });
      }

      const turn_id = await agent_chat.createChatTurn(chat_session_id, input);

      agent_chat.executeChatTurn(chat_session_id, turn_id).catch((error) => {
        console.error("Chat turn execution failed:", error);
      });

      return turn_id;
    },
    subscribeToTurn: (
      turn_id: string,
      handler: Parameters<AppContext["eventBus"]["subscribe"]>[1],
    ) => ctx.eventBus.subscribe(turn_id, handler),
  };
}
