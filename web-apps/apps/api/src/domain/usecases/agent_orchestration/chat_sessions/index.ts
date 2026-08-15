import type { AppContext } from "../../../../server";
import { sql } from "kysely";
import { uuidv7 } from "uuidv7";
import {
  AgentOrchestrationException,
  HttpStatusCode,
} from "../../../exceptions/exception";
import type { ChatSessionEt } from "../../../entities/agent_orchestration/chat_session";

type ChatSessionInput = Pick<
  ChatSessionEt,
  "project_id" | "name" | "description" | "status"
>;
type ChatSessionUpdateInput = Pick<
  ChatSessionEt,
  "name" | "description" | "status"
>;
type ChatSessionFilters = {
  ids?: string[] | undefined;
  project_ids?: string[] | undefined;
  name?: string | undefined;
  description?: string | undefined;
  statuses?: Array<ChatSessionEt["status"]> | undefined;
};
type ChatSessionPagination = {
  limit: number;
  offset: number;
};
type ChatSessionSort = {
  by: "name" | "created_at";
  order: "asc" | "desc";
};

export const ChatSessionsUsecase = (ctx: AppContext) => {
  const hasFilters = (filters: ChatSessionFilters) =>
    Boolean(
      filters.ids?.length ||
        filters.project_ids?.length ||
        filters.name ||
        filters.description ||
        filters.statuses?.length,
    );

  const applyFilters = <QB extends { where: (...args: any[]) => any }>(
    query: QB,
    filters: ChatSessionFilters,
  ) => {
    let filtered = query;

    if (filters.ids?.length) {
      filtered = filtered.where("id", "in", filters.ids);
    }
    if (filters.project_ids?.length) {
      filtered = filtered.where("project_id", "in", filters.project_ids);
    }
    if (filters.name) {
      filtered = filtered.where("name", "ilike", `%${filters.name}%`);
    }
    if (filters.description) {
      filtered = filtered.where(
        "description",
        "ilike",
        `%${filters.description}%`,
      );
    }
    if (filters.statuses?.length) {
      filtered = filtered.where("status", "in", filters.statuses);
    }

    return filtered;
  };

  const countChatSessions = async (
    filters: ChatSessionFilters,
  ): Promise<number> => {
    if (!hasFilters(filters)) return 0;

    const row = await applyFilters(
      ctx.db
        .selectFrom("chat_sessions")
        .select(sql<number>`count(*)::int`.as("count")),
      filters,
    ).executeTakeFirstOrThrow();

    return row.count;
  };

  const getChatSession = async (id: string): Promise<ChatSessionEt> => {
    const chat_session = (await ctx.db
      .selectFrom("chat_sessions")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst()) as ChatSessionEt | undefined;

    if (!chat_session) {
      throw new AgentOrchestrationException({
        public_message: "Chat session not found.",
        status_code: HttpStatusCode.NOT_FOUND,
      });
    }

    return chat_session;
  };

  const createChatSession = async (
    input: ChatSessionInput,
  ): Promise<ChatSessionEt> => {
    const id = uuidv7();
    await ctx.db
      .insertInto("chat_sessions")
      .values({
        id,
        project_id: input.project_id,
        name: input.name,
        description: input.description,
        status: input.status,
      })
      .executeTakeFirstOrThrow();

    return getChatSession(id);
  };

  return {
    createChatSession,
    getChatSession,
    getChatSessions: async (
      filters: ChatSessionFilters,
      pagination: ChatSessionPagination,
      sort: ChatSessionSort,
    ) => {
      if (!hasFilters(filters) && !pagination) {
        return { total: 0, records: [] };
      }

      let recordsQuery = applyFilters(
        ctx.db.selectFrom("chat_sessions").selectAll(),
        filters,
      );
      recordsQuery = recordsQuery
        .orderBy(sort.by, sort.order)
        .limit(pagination.limit)
        .offset(pagination.offset);

      const [total, records] = await Promise.all([
        countChatSessions(filters),
        recordsQuery.execute() as Promise<ChatSessionEt[]>,
      ]);

      return { total, records };
    },
    countChatSessions(filters: ChatSessionFilters): Promise<number> {
      return countChatSessions(filters);
    },
    async updateChatSession(
      id: string,
      input: ChatSessionUpdateInput,
    ): Promise<void> {
      await ctx.db
        .updateTable("chat_sessions")
        .set({
          name: input.name,
          description: input.description,
          status: input.status,
        })
        .where("id", "=", id)
        .execute();
    },
    async deleteChatSession(id: string): Promise<void> {
      await ctx.db
        .deleteFrom("chat_sessions")
        .where("id", "=", id)
        .execute();
    },
  };
};
