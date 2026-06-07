import type { AppContext } from "../../../../server";
import { sql } from "kysely";
import {
  HttpStatusCode,
  MockApiException,
} from "../../../exceptions/exception";
import type { MockApiEt } from "../../../entities/mock_api";

type MockApiInput = Pick<
  MockApiEt,
  "project_id" | "method" | "path" | "name" | "description" | "variables"
>;

type MockApiFilters = {
  ids?: string[] | undefined;
  project_ids?: string[] | undefined;
  method?: string | undefined;
  path?: string | undefined;
  name?: string | undefined;
  description?: string | undefined;
};

type MockApiPagination = {
  limit: number;
  offset: number;
};

type MockApiSort = {
  by: "name" | "created_at";
  order: "asc" | "desc";
};

export const MockApisUsecase = (ctx: AppContext) => {
  return {
    createMockApi: async (input: MockApiInput): Promise<MockApiEt> => {
      const mock_api = await ctx.db
        .insertInto("mock_apis")
        .values({
          project_id: input.project_id,
          method: input.method,
          path: input.path,
          name: input.name,
          description: input.description,
          ...(input.variables
            ? { variables: JSON.stringify(input.variables) }
            : {}),
        })
        .returningAll()
        .executeTakeFirst();

      if (!mock_api) {
        throw new MockApiException({
          public_message: "Error encountered while creating mock API.",
        });
      }

      return mock_api;
    },
    getMockApi: async (id: string): Promise<MockApiEt> => {
      const mock_api = await ctx.db
        .selectFrom("mock_apis")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();

      if (!mock_api) {
        throw new MockApiException({
          public_message: "Mock API not found.",
          status_code: HttpStatusCode.NOT_FOUND,
        });
      }

      return mock_api;
    },
    getMockApis: async (
      filters: MockApiFilters,
      pagination: MockApiPagination,
      sort: MockApiSort,
    ) => {
      if (
        !filters.ids?.length &&
        !filters.project_ids?.length &&
        !filters.method &&
        !filters.path &&
        !filters.name &&
        !filters.description
      ) {
        return {
          total: 0,
          records: [],
        };
      }

      let countQuery = ctx.db
        .selectFrom("mock_apis")
        .select(sql<number>`count(*)::int`.as("count"));
      let recordsQuery = ctx.db
        .selectFrom("mock_apis")
        .select([
          "id",
          "project_id",
          "method",
          "path",
          "name",
          "description",
          "created_at",
        ]);

      if (filters.ids?.length) {
        countQuery = countQuery.where("id", "in", filters.ids);
        recordsQuery = recordsQuery.where("id", "in", filters.ids);
      }

      if (filters.project_ids?.length) {
        countQuery = countQuery.where("project_id", "in", filters.project_ids);
        recordsQuery = recordsQuery.where("project_id", "in", filters.project_ids);
      }

      if (filters.method) {
        countQuery = countQuery.where("method", "=", filters.method);
        recordsQuery = recordsQuery.where("method", "=", filters.method);
      }

      if (filters.path) {
        countQuery = countQuery.where("path", "ilike", `%${filters.path}%`);
        recordsQuery = recordsQuery.where("path", "ilike", `%${filters.path}%`);
      }

      if (filters.name) {
        countQuery = countQuery.where("name", "ilike", `%${filters.name}%`);
        recordsQuery = recordsQuery.where("name", "ilike", `%${filters.name}%`);
      }

      if (filters.description) {
        countQuery = countQuery.where(
          "description",
          "ilike",
          `%${filters.description}%`,
        );
        recordsQuery = recordsQuery.where(
          "description",
          "ilike",
          `%${filters.description}%`,
        );
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
    async updateMockApi(id: string, input: MockApiInput): Promise<void> {
      await ctx.db
        .updateTable("mock_apis")
        .set({
          project_id: input.project_id,
          method: input.method,
          path: input.path,
          name: input.name,
          description: input.description,
          ...(input.variables
            ? { variables: JSON.stringify(input.variables) }
            : {}),
        })
        .where("id", "=", id)
        .execute();
    },
    async deleteMockApi(id: string): Promise<void> {
      await ctx.db
        .deleteFrom("mock_apis")
        .where("id", "=", id)
        .execute();
    },
  };
};
