import type { ChatTurnBlobMimeType } from "./chat";

export type ChatTurnBlobEt = {
  id: string;
  mime_type: ChatTurnBlobMimeType;
  size_bytes: number;
  content: Buffer;
  created_at: Date;
};
