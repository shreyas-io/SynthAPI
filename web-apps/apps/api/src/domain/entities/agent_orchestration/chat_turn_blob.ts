export type ChatTurnBlobMimeType =
  | "text/plain"
  | "text/markdown"
  | "text/csv"
  | "application/json"
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type ChatTurnBlobEt = {
  id: string;
  mime_type: ChatTurnBlobMimeType;
  size_bytes: number;
  content: Buffer;
  created_at: Date;
};
