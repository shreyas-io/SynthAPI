import type { ChatSessionTurnEt } from "../../../../domain/entities/chat_session_turn";
import type { DatabaseClient } from "../../index";

type ChatSessionTurnUpdateInput = Pick<
  ChatSessionTurnEt,
  "conversation_context" | "status"
>;

export const updateChatSessionTurn =
  (client: DatabaseClient) =>
  async (id: string, input: ChatSessionTurnUpdateInput): Promise<void> => {
    await client.db
      .updateTable("chat_session_turns")
      .set({
        conversation_context: input.conversation_context
          ? JSON.stringify(input.conversation_context)
          : null,
        status: input.status,
      })
      .where("id", "=", id)
      .execute();
  };
