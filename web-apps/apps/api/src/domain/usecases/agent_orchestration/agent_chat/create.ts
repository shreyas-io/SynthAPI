import type { AppContext } from "../../../../server";
import { sql } from "kysely";
import { uuidv7 } from "uuidv7";
import {
  AgentOrchestrationException,
  HttpStatusCode,
} from "../../../exceptions/exception";
import type { ChatTurnUserInput } from "../../../entities/agent_orchestration/chat_session_turn";

export async function createChatTurn(
  ctx: AppContext,
  chat_session_id: string,
  input: {
    user_input: ChatTurnUserInput;
  },
): Promise<string> {
  const session = await ctx.db
    .selectFrom("chat_sessions")
    .select(sql<number>`count(*)::int`.as("count"))
    .where("id", "=", chat_session_id)
    .executeTakeFirstOrThrow();
  if (session.count === 0) {
    throw new AgentOrchestrationException({
      public_message: "Chat session not found.",
      status_code: HttpStatusCode.NOT_FOUND,
    });
  }

  const turnId = uuidv7();
  await ctx.db
    .insertInto("chat_session_turns")
    .values({
      id: turnId,
      chat_session_id,
      mode: "execution",
      user_input: JSON.stringify(input.user_input),
      conversation_context: null,
      status: "in_progress",
    })
    .executeTakeFirstOrThrow();

  await ctx.db
    .insertInto("chat_turn_events")
    .values({
      id: uuidv7(),
      chat_turn_id: turnId,
      sequence: 1,
      event_type: "user-input",
      payload: JSON.stringify({ type: "user-input", input: input.user_input }),
    })
    .executeTakeFirstOrThrow();

  ctx.eventBus.publish(turnId, {
    type: "user-input",
    input: input.user_input,
  });

  return turnId;
}
