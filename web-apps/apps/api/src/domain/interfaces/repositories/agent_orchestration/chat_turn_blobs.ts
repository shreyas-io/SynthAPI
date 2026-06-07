import type { ChatTurnBlobEt } from "../../../entities/agent_orchestration/chat_turn_blob";
import type { ChatTurnBlobMimeType } from "../../../entities/agent_orchestration/chat_turn_blob";

type ChatTurnBlobInput = Pick<
  ChatTurnBlobEt,
  "mime_type" | "size_bytes" | "content"
>;
type ColumnKeys = Extract<keyof ChatTurnBlobEt, string>;

export interface IChatTurnBlobsRepository {
  count: (params: {
    filters: {
      ids?: string[] | undefined;
      mime_types?: ChatTurnBlobMimeType[] | undefined;
    };
  }) => Promise<number>;
  create: (input: ChatTurnBlobInput) => Promise<string>;
  list: {
    (params: {
      filters: {
        ids?: string[] | undefined;
        mime_types?: ChatTurnBlobMimeType[] | undefined;
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
        ids?: string[] | undefined;
        mime_types?: ChatTurnBlobMimeType[] | undefined;
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
