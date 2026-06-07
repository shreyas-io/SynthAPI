import type { AppContext } from "../../../../application/agent_orchestration/context";
import {
  AgentOrchestrationException,
  HttpStatusCode,
} from "../../../exceptions/exception";
import { ChatSessionTurnsRepository } from "../../../../infrastructure/kysely/repositories/agent_orchestration/chat_session_turns";
import { ChatSessionsRepository } from "../../../../infrastructure/kysely/repositories/agent_orchestration/chat_sessions";
import { ChatTurnEventsRepository } from "../../../../infrastructure/kysely/repositories/agent_orchestration/chat_turn_events";
import type { ChatTurnUserInput } from "../../../entities/agent_orchestration/chat_session_turn";

export async function createChatTurn(
  ctx: AppContext,
  chat_session_id: string,
  input: {
    user_input: ChatTurnUserInput;
    mode: "execution" | "planning";
  },
): Promise<string> {
  const chat_sessions_repo = ChatSessionsRepository(ctx.database);
  const chat_turns = ChatSessionTurnsRepository(ctx.database);
  const chat_events = ChatTurnEventsRepository(ctx.database);
  const count = await chat_sessions_repo.count({
    filters: { ids: [chat_session_id] },
  });
  if (count === 0) {
    throw new AgentOrchestrationException({
      public_message: "Chat session not found.",
      status_code: HttpStatusCode.NOT_FOUND,
    });
  }

  const turnId = await chat_turns.create({
    chat_session_id,
    mode: input.mode,
    user_input: input.user_input,
    conversation_context: null,
    status: "in_progress",
  });

  await chat_events.create({
    chat_turn_id: turnId,
    sequence: 1,
    event_type: "user-input",
    payload: { type: "user-input", input: input.user_input },
  });

  ctx.eventBus.publish(turnId, {
    type: "user-input",
    input: input.user_input,
  });

  return turnId;
}
