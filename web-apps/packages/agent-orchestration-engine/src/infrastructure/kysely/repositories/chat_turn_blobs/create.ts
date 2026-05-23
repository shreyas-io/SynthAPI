import { uuidv7 } from "uuidv7";

import type { ChatTurnBlobEt } from "../../../../domain/entities/chat_turn_blob";
import type { DatabaseClient } from "../../index";

type ChatTurnBlobInput = Pick<
  ChatTurnBlobEt,
  "mime_type" | "size_bytes" | "content"
>;

export const createChatTurnBlob =
  (client: DatabaseClient) =>
  async (input: ChatTurnBlobInput): Promise<string> => {
    const id = uuidv7();

    await client.db
      .insertInto("chat_turn_blobs")
      .values({
        id,
        mime_type: input.mime_type,
        size_bytes: input.size_bytes,
        content: input.content,
      })
      .executeTakeFirstOrThrow();

    return id;
  };
