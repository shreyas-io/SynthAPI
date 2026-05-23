import type { ChatTurnBlobEt } from "../../../../domain/entities/chat_turn_blob";
import type { ChatTurnBlobMimeType } from "../../../../domain/entities/chat_turn_blob";
import type { IChatTurnBlobsRepository } from "../../../../domain/entities/interfaces/repositories/chat_turn_blobs";
import type { DatabaseClient } from "../../index";

type ChatTurnBlobFilters = {
  ids?: string[];
  mime_types?: ChatTurnBlobMimeType[];
};

type ChatTurnBlobPagination = {
  limit: number;
  offset: number;
};

type ChatTurnBlobSort = {
  by: "created_at";
  order: "asc" | "desc";
};

type ColumnKeys = Extract<keyof ChatTurnBlobEt, string>;

export const list = (
  client: DatabaseClient,
): IChatTurnBlobsRepository["list"] => {
  async function listChatTurnBlobs(params: {
    filters: ChatTurnBlobFilters;
    pagination?: ChatTurnBlobPagination;
    sort?: ChatTurnBlobSort;
  }): Promise<ChatTurnBlobEt[]>;
  async function listChatTurnBlobs<C extends readonly ColumnKeys[]>(params: {
    filters: ChatTurnBlobFilters;
    columns: C;
    pagination?: ChatTurnBlobPagination;
    sort?: ChatTurnBlobSort;
  }): Promise<Pick<ChatTurnBlobEt, C[number]>[]>;
  async function listChatTurnBlobs<C extends readonly ColumnKeys[]>({
    filters,
    columns,
    pagination,
    sort,
  }: {
    filters: ChatTurnBlobFilters;
    columns?: C;
    pagination?: ChatTurnBlobPagination;
    sort?: ChatTurnBlobSort;
  }): Promise<ChatTurnBlobEt[] | Pick<ChatTurnBlobEt, C[number]>[]> {
    if (!filters.ids?.length && !filters.mime_types?.length && !pagination)
      return [];

    let query = client.db.selectFrom("chat_turn_blobs");

    if (columns?.length) {
      query = query.select(columns);
    } else {
      query = query.selectAll();
    }

    if (filters.ids?.length) {
      query = query.where("id", "in", filters.ids);
    }

    if (filters.mime_types?.length) {
      query = query.where("mime_type", "in", filters.mime_types);
    }

    if (sort?.by) {
      query = query.orderBy(sort.by, sort.order);
    }

    if (pagination?.limit) {
      query = query.limit(pagination.limit).offset(pagination.offset);
    }

    const rows = await query.execute();

    return rows as ChatTurnBlobEt[] | Pick<ChatTurnBlobEt, ColumnKeys>[];
  }

  return listChatTurnBlobs;
};
