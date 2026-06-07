import type { AppContext } from "../../../../server";
import { sql } from "kysely";
import { uuidv7 } from "uuidv7";
import {
  AgentOrchestrationException,
  HttpStatusCode,
} from "../../../exceptions/exception";
import type {
  ChatTurnBlobEt,
  ChatTurnBlobMimeType,
} from "../../../entities/agent_orchestration/chat_turn_blob";

type ChatTurnBlobInput = Pick<
  ChatTurnBlobEt,
  "mime_type" | "size_bytes" | "content"
>;
type ChatTurnBlobFilters = {
  ids?: string[] | undefined;
  mime_types?: ChatTurnBlobMimeType[] | undefined;
};
type ChatTurnBlobPagination = {
  limit: number;
  offset: number;
};
type ChatTurnBlobSort = {
  by: "created_at";
  order: "asc" | "desc";
};

export const ChatTurnBlobsUsecase = (ctx: AppContext) => {
  const hasFilters = (filters: ChatTurnBlobFilters) =>
    Boolean(filters.ids?.length || filters.mime_types?.length);

  const applyFilters = <QB extends { where: (...args: any[]) => any }>(
    query: QB,
    filters: ChatTurnBlobFilters,
  ) => {
    let filtered = query;
    if (filters.ids?.length) {
      filtered = filtered.where("id", "in", filters.ids);
    }
    if (filters.mime_types?.length) {
      filtered = filtered.where("mime_type", "in", filters.mime_types);
    }
    return filtered;
  };

  const countChatTurnBlobs = async (
    filters: ChatTurnBlobFilters,
  ): Promise<number> => {
    if (!hasFilters(filters)) return 0;

    const row = await applyFilters(
      ctx.db
        .selectFrom("chat_turn_blobs")
        .select(sql<number>`count(*)::int`.as("count")),
      filters,
    ).executeTakeFirstOrThrow();

    return row.count;
  };

  const getChatTurnBlob = async (id: string): Promise<ChatTurnBlobEt> => {
    const chat_turn_blob = await ctx.db
      .selectFrom("chat_turn_blobs")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst() as ChatTurnBlobEt | undefined;

    if (!chat_turn_blob) {
      throw new AgentOrchestrationException({
        public_message: "Chat turn blob not found.",
        status_code: HttpStatusCode.NOT_FOUND,
      });
    }

    return chat_turn_blob;
  };

  return {
    createChatTurnBlob: async (
      input: ChatTurnBlobInput,
    ): Promise<ChatTurnBlobEt> => {
      const id = uuidv7();
      await ctx.db
        .insertInto("chat_turn_blobs")
        .values({
          id,
          mime_type: input.mime_type,
          size_bytes: input.size_bytes,
          content: input.content,
        })
        .executeTakeFirstOrThrow();

      return getChatTurnBlob(id);
    },
    getChatTurnBlob,
    getChatTurnBlobs: async (
      filters: ChatTurnBlobFilters,
      pagination: ChatTurnBlobPagination,
      sort: ChatTurnBlobSort,
    ) => {
      if (!hasFilters(filters) && !pagination) {
        return { total: 0, records: [] };
      }

      let recordsQuery = applyFilters(
        ctx.db.selectFrom("chat_turn_blobs").selectAll(),
        filters,
      );
      recordsQuery = recordsQuery
        .orderBy(sort.by, sort.order)
        .limit(pagination.limit)
        .offset(pagination.offset);

      const [total, records] = await Promise.all([
        countChatTurnBlobs(filters),
        recordsQuery.execute() as Promise<ChatTurnBlobEt[]>,
      ]);

      return { total, records };
    },
    countChatTurnBlobs(filters: ChatTurnBlobFilters): Promise<number> {
      return countChatTurnBlobs(filters);
    },
    async deleteChatTurnBlob(id: string): Promise<void> {
      await ctx.db
        .deleteFrom("chat_turn_blobs")
        .where("id", "=", id)
        .execute();
    },
  };
};
