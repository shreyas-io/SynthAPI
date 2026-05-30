import type { AppContext } from "../..";
import { AgentChatUsecase } from "../../domain/usecases/agent_chat";
import { AgentOrchestrationException } from "../../exceptions/exception";
import { createChatTurnDto } from "../dto/agent_chat";

export function AgentChat(ctx: AppContext) {
  const agent_chat = AgentChatUsecase(ctx);

  return {
    createChatTurn: async (chat_session_id: string, data: unknown) => {
      const { data: v, success, error } = createChatTurnDto.safeParse(data);

      if (!success)
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(error.issues),
        });

      const turnId = await agent_chat.createChatTurn(chat_session_id, v);

      // Fire and forget execution so the client can immediately open SSE.
      agent_chat.executeChatTurn(chat_session_id, turnId).catch((err) => {
        console.error("Chat turn execution failed:", err);
      });

      return turnId;
    },

    subscribeToTurn: (
      turnId: string,
      handler: (event: unknown) => void,
    ): (() => void) => {
      if (!ctx.eventBus) {
        return () => {};
      }
      return ctx.eventBus.subscribe(turnId, handler);
    },
  };
}
