import type { AppContext } from "../../../../application/agent_orchestration/context";
import { sql } from "kysely";
import {
  HttpStatusCode,
  MockApiException,
} from "../../../exceptions/exception";
import { MockApiResponseEt } from "../../../entities/mock_api_response/mock_api_response";

type MockApiResponseInput = Pick<
  MockApiResponseEt,
  | "mock_api_id"
  | "name"
  | "is_default"
  | "response"
  | "rule_tree"
  | "post_response_actions"
>;

type MockApiResponseFilters = {
  ids?: string[];
  mock_api_ids?: string[];
  name?: string;
};

type MockApiResponsePagination = {
  limit: number;
  offset: number;
};

type MockApiResponseSort = {
  by: "name" | "created_at";
  order: "asc" | "desc";
};

export const MockApiResponsesUsecase = (ctx: AppContext) => {
  return {
    createMockApiResponse: async (
      input: MockApiResponseInput,
    ): Promise<MockApiResponseEt> => {
      const mock_api_response = await ctx.database.db
        .transaction()
        .execute(async (trx) => {
          if (input.is_default) {
            await trx
              .updateTable("mock_api_responses")
              .set({ is_default: false })
              .where("mock_api_id", "=", input.mock_api_id)
              .execute();
          }

          return trx
            .insertInto("mock_api_responses")
            .values({
              mock_api_id: input.mock_api_id,
              name: input.name,
              is_default: input.is_default,
              response: JSON.stringify(input.response),
              ...(input.rule_tree
                ? { rule_tree: JSON.stringify(input.rule_tree) }
                : {}),
              ...(input.post_response_actions
                ? {
                    post_response_actions: JSON.stringify(
                      input.post_response_actions,
                    ),
                  }
                : {}),
            })
            .returningAll()
            .executeTakeFirst();
        });

      if (!mock_api_response) {
        throw new MockApiException({
          public_message: "Error encountered while creating mock API response.",
        });
      }

      return mock_api_response as unknown as MockApiResponseEt;
    },
    getMockApiResponse: async (id: string): Promise<MockApiResponseEt> => {
      const mock_api_response = await ctx.database.db
        .selectFrom("mock_api_responses")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();

      if (!mock_api_response) {
        throw new MockApiException({
          public_message: "Mock API response not found.",
          status_code: HttpStatusCode.NOT_FOUND,
        });
      }

      return mock_api_response as unknown as MockApiResponseEt;
    },
    getMockApiResponses: async (
      filters: MockApiResponseFilters,
      pagination: MockApiResponsePagination,
      sort: MockApiResponseSort,
    ) => {
      if (
        !filters.ids?.length &&
        !filters.mock_api_ids?.length &&
        !filters.name
      ) {
        return {
          total: 0,
          records: [],
        };
      }

      let countQuery = ctx.database.db
        .selectFrom("mock_api_responses")
        .select(sql<number>`count(*)::int`.as("count"));
      let recordsQuery = ctx.database.db
        .selectFrom("mock_api_responses")
        .select(["id", "mock_api_id", "name", "is_default", "created_at"]);

      if (filters.ids?.length) {
        countQuery = countQuery.where("id", "in", filters.ids);
        recordsQuery = recordsQuery.where("id", "in", filters.ids);
      }

      if (filters.mock_api_ids?.length) {
        countQuery = countQuery.where(
          "mock_api_id",
          "in",
          filters.mock_api_ids,
        );
        recordsQuery = recordsQuery.where(
          "mock_api_id",
          "in",
          filters.mock_api_ids,
        );
      }

      if (filters.name) {
        countQuery = countQuery.where("name", "ilike", `%${filters.name}%`);
        recordsQuery = recordsQuery.where("name", "ilike", `%${filters.name}%`);
      }

      recordsQuery = recordsQuery
        .orderBy(sort.by, sort.order)
        .limit(pagination.limit)
        .offset(pagination.offset);

      const [total, records] = await Promise.all([
        countQuery.executeTakeFirstOrThrow().then((row) => row.count),
        recordsQuery.execute(),
      ]);
      return {
        total,
        records,
      };
    },
    async updateMockApiResponse(
      id: string,
      input: MockApiResponseInput,
    ): Promise<void> {
      await ctx.database.db.transaction().execute(async (trx) => {
        if (input.is_default) {
          await trx
            .updateTable("mock_api_responses")
            .set({ is_default: false })
            .where("mock_api_id", "=", input.mock_api_id)
            .where("id", "!=", id)
            .execute();
        }

        await trx
          .updateTable("mock_api_responses")
          .set({
            mock_api_id: input.mock_api_id,
            name: input.name,
            is_default: input.is_default,
            response: JSON.stringify(input.response),
            ...(input.rule_tree
              ? { rule_tree: JSON.stringify(input.rule_tree) }
              : {}),
            ...(input.post_response_actions
              ? {
                  post_response_actions: JSON.stringify(
                    input.post_response_actions,
                  ),
                }
              : {}),
          })
          .where("id", "=", id)
          .execute();
      });
    },
    async deleteMockApiResponse(id: string): Promise<void> {
      await ctx.database.db
        .deleteFrom("mock_api_responses")
        .where("id", "=", id)
        .execute();
    },
  };
};
