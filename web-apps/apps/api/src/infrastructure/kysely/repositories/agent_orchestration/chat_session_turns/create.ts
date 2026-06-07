import { uuidv7 } from "uuidv7";

import type { ChatSessionTurnEt } from "../../../../../domain/entities/agent_orchestration/chat_session_turn";
import type { DatabaseClient } from "../../../index";

type ChatSessionTurnInput = Pick<
  ChatSessionTurnEt,
  "chat_session_id" | "mode" | "user_input" | "conversation_context" | "status"
>;

export const createChatSessionTurn =
  (client: DatabaseClient) =>
  async (input: ChatSessionTurnInput): Promise<string> => {
    const id = uuidv7();

    await client.db
      .insertInto("chat_session_turns")
      .values({
        id,
        chat_session_id: input.chat_session_id,
        mode: input.mode,
        user_input: JSON.stringify(input.user_input),
        conversation_context: input.conversation_context
          ? JSON.stringify(input.conversation_context)
          : null,
        status: input.status,
      })
      .executeTakeFirstOrThrow();

    return id;
  };
