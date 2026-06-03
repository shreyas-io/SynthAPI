import {
  AgentOrchestrationException,
  HttpStatusCode,
} from "../../domain/exceptions/exception";
import { AgentChatUsecase } from "../../domain/usecases/agent_orchestration/agent_chat";
import type { ToolWorkspaceContext } from "../../domain/usecases/agent_orchestration/tools/types";
import type { AppContext } from "./context";
import { createChatTurnDto } from "./validation/agent_chat";

export function AgentChatApplication(ctx: AppContext) {
  const agent_chat = AgentChatUsecase(ctx);
  const runningTurns = new Set<string>();

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

      return agent_chat.createChatTurn(chat_session_id, input);
    },
    executeChatTurn: (
      chat_session_id: string,
      turn_id: string,
      workspace?: ToolWorkspaceContext,
    ) => {
      if (runningTurns.has(turn_id)) {
        return;
      }

      runningTurns.add(turn_id);
      agent_chat
        .executeChatTurn(chat_session_id, turn_id, workspace)
        .catch((error) => {
          console.error("Chat turn execution failed:", error);
        })
        .finally(() => {
          runningTurns.delete(turn_id);
        });
    },
    getTurnStatus: async (turn_id: string) => {
      const turn = await ctx.database.db
        .selectFrom("chat_session_turns")
        .select(["id", "chat_session_id", "status"])
        .where("id", "=", turn_id)
        .executeTakeFirst();
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
