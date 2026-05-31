import {
  AgentOrchestrationException,
  HttpStatusCode,
} from "../../domain/exceptions/exception";
import { AgentChatUsecase } from "../../domain/usecases/agent_orchestration/agent_chat";
import type { ToolWorkspaceContext } from "../../domain/usecases/agent_orchestration/tools/types";
import { ChatSessionTurnsRepository } from "../../infrastructure/kysely/repositories/agent_orchestration/chat_session_turns";
import type { AppContext } from "./context";
import { createChatTurnDto } from "./validation/agent_chat";

export function AgentChatApplication(ctx: AppContext) {
  const agent_chat = AgentChatUsecase(ctx);
  const chat_turns_repo = ChatSessionTurnsRepository(ctx.database);

  return {
    createChatTurn: async (
      chat_session_id: string,
      data: unknown,
      workspace?: ToolWorkspaceContext,
    ) => {
      const { data: input, success, error } = createChatTurnDto.safeParse(data);

      if (!success) {
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(error.issues),
        });
      }

      const turn_id = await agent_chat.createChatTurn(chat_session_id, input);

      agent_chat
        .executeChatTurn(chat_session_id, turn_id, workspace)
        .catch((error) => {
          console.error("Chat turn execution failed:", error);
        });

      return turn_id;
    },
    getTurnStatus: async (turn_id: string) => {
      const turns = await chat_turns_repo.list({
        filters: { ids: [turn_id] },
        columns: ["id", "chat_session_id", "status"],
      });
      const turn = turns.at(0);
      if (!turn) {
        throw new AgentOrchestrationException({
          public_message: "Turn not found.",
          status_code: HttpStatusCode.NOT_FOUND,
        });
      }
      return {
        id: turn.id,
        chat_session_id: turn.chat_session_id,
        status: turn.status,
      };
    },
    subscribeToTurn: (
      turn_id: string,
      handler: Parameters<AppContext["eventBus"]["subscribe"]>[1],
    ) => ctx.eventBus.subscribe(turn_id, handler),
  };
}
