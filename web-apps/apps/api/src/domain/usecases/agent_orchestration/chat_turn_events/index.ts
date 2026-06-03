import type { AppContext } from "../../../../application/agent_orchestration/context";
import { sql } from "kysely";
import { uuidv7 } from "uuidv7";
import {
  AgentOrchestrationException,
  HttpStatusCode,
} from "../../../exceptions/exception";
import type {
  ChatTurnEventEt,
  ChatTurnEventType,
} from "../../../entities/agent_orchestration/chat_turn_event";

type ChatTurnEventInput = Pick<
  ChatTurnEventEt,
  "chat_turn_id" | "sequence" | "event_type" | "payload"
>;
type ChatTurnEventFilters = {
  ids?: string[] | undefined;
  chat_turn_ids?: string[] | undefined;
  chat_session_ids?: string[] | undefined;
  event_types?: ChatTurnEventType[] | undefined;
};
type ChatTurnEventPagination = {
  limit: number;
  offset: number;
};
type ChatTurnEventSort = {
  by: "sequence" | "created_at";
  order: "asc" | "desc";
};

export const ChatTurnEventsUsecase = (ctx: AppContext) => {
  const hasFilters = (filters: ChatTurnEventFilters) =>
    Boolean(
      filters.ids?.length ||
        filters.chat_turn_ids?.length ||
        filters.chat_session_ids?.length ||
        filters.event_types?.length,
    );

  const countChatTurnEvents = async (
    filters: ChatTurnEventFilters,
  ): Promise<number> => {
    if (!hasFilters(filters)) return 0;

    let query = ctx.database.db
      .selectFrom("chat_turn_events")
      .select(sql<number>`count(*)::int`.as("count"));

    if (filters.ids?.length) {
      query = query.where("id", "in", filters.ids);
    }
    if (filters.chat_turn_ids?.length) {
      query = query.where("chat_turn_id", "in", filters.chat_turn_ids);
    }
    if (filters.chat_session_ids?.length) {
      query = query
        .innerJoin(
          "chat_session_turns",
          "chat_turn_events.chat_turn_id",
          "chat_session_turns.id",
        )
        .where(
          "chat_session_turns.chat_session_id",
          "in",
          filters.chat_session_ids,
        );
    }
    if (filters.event_types?.length) {
      query = query.where("event_type", "in", filters.event_types);
    }

    const row = await query.executeTakeFirstOrThrow();
    return row.count;
  };

  const getChatTurnEvent = async (id: string): Promise<ChatTurnEventEt> => {
    const chat_turn_event = (await ctx.database.db
      .selectFrom("chat_turn_events")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst()) as unknown as ChatTurnEventEt | undefined;

    if (!chat_turn_event) {
      throw new AgentOrchestrationException({
        public_message: "Chat turn event not found.",
        status_code: HttpStatusCode.NOT_FOUND,
      });
    }

    return chat_turn_event;
  };

  return {
    createChatTurnEvent: async (
      input: ChatTurnEventInput,
    ): Promise<ChatTurnEventEt> => {
      const id = uuidv7();
      await ctx.database.db
        .insertInto("chat_turn_events")
        .values({
          id,
          chat_turn_id: input.chat_turn_id,
          sequence: input.sequence,
          event_type: input.event_type,
          payload: JSON.stringify(input.payload),
        })
        .executeTakeFirstOrThrow();

      return getChatTurnEvent(id);
    },
    getChatTurnEvent,
    getChatTurnEvents: async (
      filters: ChatTurnEventFilters,
      pagination: ChatTurnEventPagination,
      sort: ChatTurnEventSort,
    ) => {
      if (!hasFilters(filters) && !pagination) {
        return { total: 0, records: [] };
      }

      let recordsQuery = ctx.database.db.selectFrom("chat_turn_events");

      if (filters.ids?.length) {
        recordsQuery = recordsQuery.where("id", "in", filters.ids);
      }
      if (filters.chat_turn_ids?.length) {
        recordsQuery = recordsQuery.where(
          "chat_turn_id",
          "in",
          filters.chat_turn_ids,
        );
      }
      if (filters.chat_session_ids?.length) {
        recordsQuery = recordsQuery
          .innerJoin(
            "chat_session_turns",
            "chat_turn_events.chat_turn_id",
            "chat_session_turns.id",
          )
          .where(
            "chat_session_turns.chat_session_id",
            "in",
            filters.chat_session_ids,
          );
      }
      if (filters.event_types?.length) {
        recordsQuery = recordsQuery.where(
          "event_type",
          "in",
          filters.event_types,
        );
      }

      if (filters.chat_session_ids?.length) {
        recordsQuery = recordsQuery
          .orderBy(sql`chat_session_turns.created_at`, "asc")
          .selectAll("chat_turn_events");
      } else {
        recordsQuery = recordsQuery.selectAll();
      }

      recordsQuery = recordsQuery
        .orderBy(sort.by, sort.order)
        .limit(pagination.limit)
        .offset(pagination.offset);

      const [total, records] = await Promise.all([
        countChatTurnEvents(filters),
        recordsQuery.execute() as Promise<ChatTurnEventEt[]>,
      ]);

      return { total, records };
    },
    countChatTurnEvents(filters: ChatTurnEventFilters): Promise<number> {
      return countChatTurnEvents(filters);
    },
    async deleteChatTurnEvent(id: string): Promise<void> {
      await ctx.database.db
        .deleteFrom("chat_turn_events")
        .where("id", "=", id)
        .execute();
    },
  };
};
