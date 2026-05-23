import type { ChatTurnBlobEt } from "../../chat_turn_blob";
import type { ChatTurnBlobMimeType } from "../../chat";

type ChatTurnBlobInput = Pick<
  ChatTurnBlobEt,
  "mime_type" | "size_bytes" | "content"
>;
type ColumnKeys = Extract<keyof ChatTurnBlobEt, string>;

export interface IChatTurnBlobsRepository {
  count: (params: {
    filters: {
      ids?: string[];
      mime_types?: ChatTurnBlobMimeType[];
    };
  }) => Promise<number>;
  create: (input: ChatTurnBlobInput) => Promise<string>;
  list: {
    (params: {
      filters: {
        ids?: string[];
        mime_types?: ChatTurnBlobMimeType[];
      };
      pagination?: {
        limit: number;
        offset: number;
      };
      sort?: {
        by: "created_at";
        order: "asc" | "desc";
      };
    }): Promise<ChatTurnBlobEt[]>;
    <C extends readonly ColumnKeys[]>(params: {
      filters: {
        ids?: string[];
        mime_types?: ChatTurnBlobMimeType[];
      };
      columns: C;
      pagination?: {
        limit: number;
        offset: number;
      };
      sort?: {
        by: "created_at";
        order: "asc" | "desc";
      };
    }): Promise<Pick<ChatTurnBlobEt, C[number]>[]>;
  };
  delete: (id: string) => Promise<void>;
}
