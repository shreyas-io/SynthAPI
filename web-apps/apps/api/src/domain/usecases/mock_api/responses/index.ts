import type { AppContext } from "../../../../server";
import { sql } from "kysely";
import {
  HttpStatusCode,
  MockApiException,
} from "../../../exceptions/exception";
import type { AuthenticatedUser } from "../../../entities/authenticated_user";
import { MockApiResponseEt } from "../../../entities/mock_api_response/mock_api_response";
import { MockApisUsecase } from "../apis";
import { ProjectsUsecase } from "../projects";

type MockApiResponseInput = Pick<
  MockApiResponseEt,
  | "mock_api_id"
  | "name"
  | "is_default"
  | "response"
  | "rule_tree"
  | "post_response_actions"
> & {
  execution_order?: number;
};

type MockApiResponseFilters = {
  ids?: string[] | undefined;
  mock_api_ids?: string[] | undefined;
  name?: string | undefined;
  fetch_deleted?: boolean | undefined;
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
      user: AuthenticatedUser,
      input: MockApiResponseInput,
    ): Promise<MockApiResponseEt> => {
      const mockApis = MockApisUsecase(ctx);
      await mockApis.assertMockApiWriteAccess(user, input.mock_api_id);

      const mock_api_response = await ctx.db
        .transaction()
        .execute(async (trx) => {
          const countRes = await trx
            .selectFrom("mock_api_responses")
            .select((eb) => eb.fn.count("id").as("count"))
            .where("mock_api_id", "=", input.mock_api_id)
            .where("deleted_at", "is", null)
            .executeTakeFirst();

          const expectedOrder = Number(countRes?.count ?? 0) + 1;

          if (
            input.execution_order !== undefined &&
            input.execution_order !== expectedOrder
          ) {
            throw new MockApiException({
              public_message: `Execution order must be sequential. Expected ${expectedOrder}, got ${input.execution_order}.`,
              status_code: HttpStatusCode.BAD_REQUEST,
            });
          }

          const execution_order = input.execution_order ?? expectedOrder;

          if (input.is_default) {
            await trx
              .updateTable("mock_api_responses")
              .set({ is_default: false })
              .where("mock_api_id", "=", input.mock_api_id)
              .where("deleted_at", "is", null)
              .execute();
          }

          return trx
            .insertInto("mock_api_responses")
            .values({
              mock_api_id: input.mock_api_id,
              name: input.name,
              is_default: input.is_default,
              execution_order,
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
      const mock_api_response = await ctx.db
        .selectFrom("mock_api_responses")
        .innerJoin("mock_apis", "mock_apis.id", "mock_api_responses.mock_api_id")
        .innerJoin("projects", "projects.id", "mock_apis.project_id")
        .selectAll("mock_api_responses")
        .where("mock_api_responses.id", "=", id)
        .where("mock_api_responses.deleted_at", "is", null)
        .where("mock_apis.deleted_at", "is", null)
        .where("projects.deleted_at", "is", null)
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

      let countQuery = ctx.db
        .selectFrom("mock_api_responses")
        .select(sql<number>`count(*)::int`.as("count"));
      let recordsQuery = ctx.db
        .selectFrom("mock_api_responses")
        .select([
          "id",
          "mock_api_id",
          "name",
          "is_default",
          "deleted_at",
          "created_at",
        ]);

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

      if (filters.fetch_deleted) {
        countQuery = countQuery.where("deleted_at", "is not", null);
        recordsQuery = recordsQuery.where("deleted_at", "is not", null);
      } else {
        countQuery = countQuery.where("deleted_at", "is", null);
        recordsQuery = recordsQuery.where("deleted_at", "is", null);
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
      user: AuthenticatedUser,
      id: string,
      input: MockApiResponseInput,
    ): Promise<void> {
      const mockApis = MockApisUsecase(ctx);
      await mockApis.assertMockApiWriteAccess(user, input.mock_api_id);

      await ctx.db.transaction().execute(async (trx) => {
        if (input.is_default) {
          await trx
            .updateTable("mock_api_responses")
            .set({ is_default: false })
            .where("mock_api_id", "=", input.mock_api_id)
            .where("id", "!=", id)
            .where("deleted_at", "is", null)
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
          .where("deleted_at", "is", null)
          .execute();
      });
    },
    async deleteMockApiResponse(user: AuthenticatedUser, id: string): Promise<void> {
      const mock_api_response = await ctx.db
        .selectFrom("mock_api_responses")
        .select(["id", "deleted_at", "mock_api_id"])
        .where("id", "=", id)
        .executeTakeFirst();

      if (!mock_api_response) {
        throw new MockApiException({
          public_message: "Mock API response not found.",
          status_code: HttpStatusCode.NOT_FOUND,
        });
      }

      if (mock_api_response.deleted_at) {
        return;
      }

      const mockApis = MockApisUsecase(ctx);
      await mockApis.assertMockApiWriteAccess(user, mock_api_response.mock_api_id);

      await ctx.db
        .updateTable("mock_api_responses")
        .set({ deleted_at: new Date() })
        .where("id", "=", id)
        .execute();
    },
    reorderMockApiResponses: async (
      user: AuthenticatedUser,
      mock_api_id: string,
      response_ids: string[],
    ): Promise<void> => {
      const mockApis = MockApisUsecase(ctx);
      await mockApis.assertMockApiWriteAccess(user, mock_api_id);

      await ctx.db.transaction().execute(async (trx) => {
        // Update execution_order incrementally based on the array order
        for (let i = 0; i < response_ids.length; i++) {
          const id = response_ids[i];
          if (id) {
            await trx
              .updateTable("mock_api_responses")
              .set({ execution_order: i + 1 })
              .where("id", "=", id)
              .where("mock_api_id", "=", mock_api_id)
              .execute();
          }
        }
      });
    },
    async restoreMockApiResponse(user: AuthenticatedUser, id: string): Promise<void> {
      await ctx.db.transaction().execute(async (trx) => {
        const mock_api_response = await trx
          .selectFrom("mock_api_responses")
          .innerJoin("mock_apis", "mock_apis.id", "mock_api_responses.mock_api_id")
          .innerJoin("projects", "projects.id", "mock_apis.project_id")
          .select([
            "mock_api_responses.id",
            "mock_api_responses.mock_api_id",
            "mock_api_responses.is_default",
          ])
          .where("mock_api_responses.id", "=", id)
          .where("mock_apis.deleted_at", "is", null)
          .where("projects.deleted_at", "is", null)
          .executeTakeFirst();

        if (!mock_api_response) {
          throw new MockApiException({
            public_message: "Mock API response not found.",
            status_code: HttpStatusCode.NOT_FOUND,
          });
        }

        const mockApis = MockApisUsecase(ctx);
        await mockApis.assertMockApiWriteAccess(user, mock_api_response.mock_api_id);

        if (mock_api_response.is_default) {
          await trx
            .updateTable("mock_api_responses")
            .set({ is_default: false })
            .where("mock_api_id", "=", mock_api_response.mock_api_id)
            .where("id", "!=", id)
            .where("deleted_at", "is", null)
            .execute();
        }

        await trx
          .updateTable("mock_api_responses")
          .set({ deleted_at: null })
          .where("id", "=", id)
          .execute();
      });
    },
  };
};
