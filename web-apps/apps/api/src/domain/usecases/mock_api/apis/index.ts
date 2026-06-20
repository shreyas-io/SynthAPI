import type { AppContext } from "../../../../server";
import { sql } from "kysely";
import {
  HttpStatusCode,
  MockApiException,
} from "../../../exceptions/exception";
import type { AuthenticatedUser } from "../../../entities/authenticated_user";
import type { MockApiEt } from "../../../entities/mock_api";
import { ProjectsUsecase } from "../projects";

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
  fetch_deleted?: boolean | undefined;
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
    assertMockApiWriteAccess: async (
      user: AuthenticatedUser,
      mockApiId: string,
    ): Promise<void> => {
      const membership = await ctx.db
        .selectFrom("mock_apis")
        .innerJoin("projects", "projects.id", "mock_apis.project_id")
        .innerJoin(
          "organization_memberships",
          "organization_memberships.organization_id",
          "projects.organization_id",
        )
        .select(["organization_memberships.role"])
        .where("mock_apis.id", "=", mockApiId)
        .where("mock_apis.deleted_at", "is", null)
        .where("projects.deleted_at", "is", null)
        .where("organization_memberships.user_id", "=", user.id)
        .where("organization_memberships.status", "=", "active")
        .executeTakeFirst();

      if (!membership) {
        throw new MockApiException({
          public_message: "You do not have access to this mock API.",
          status_code: HttpStatusCode.FORBIDDEN,
        });
      }

      if (membership.role === "viewer") {
        throw new MockApiException({
          public_message: "Viewers cannot modify resources in this organization.",
          status_code: HttpStatusCode.FORBIDDEN,
        });
      }
    },
    createMockApi: async (user: AuthenticatedUser, input: MockApiInput): Promise<MockApiEt> => {
      const projects = ProjectsUsecase(ctx);
      const project = await projects.getProject(user, input.project_id);
      await projects.assertOrganizationWriteAccess(user, project.organization_id);

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
        .innerJoin("projects", "projects.id", "mock_apis.project_id")
        .selectAll("mock_apis")
        .where("mock_apis.id", "=", id)
        .where("mock_apis.deleted_at", "is", null)
        .where("projects.deleted_at", "is", null)
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
          "deleted_at",
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
    async updateMockApi(user: AuthenticatedUser, id: string, input: MockApiInput): Promise<void> {
      const mock_api = await this.getMockApi(id);
      const projects = ProjectsUsecase(ctx);
      const project = await projects.getProject(user, mock_api.project_id);
      await projects.assertOrganizationWriteAccess(user, project.organization_id);

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
        .where("deleted_at", "is", null)
        .execute();
    },
    async deleteMockApi(user: AuthenticatedUser, id: string): Promise<void> {
      const mock_api = await ctx.db
        .selectFrom("mock_apis")
        .select(["id", "deleted_at", "project_id"])
        .where("id", "=", id)
        .executeTakeFirst();

      if (!mock_api) {
        throw new MockApiException({
          public_message: "Mock API not found.",
          status_code: HttpStatusCode.NOT_FOUND,
        });
      }

      if (mock_api.deleted_at) {
        return;
      }

      const projects = ProjectsUsecase(ctx);
      const project = await projects.getProject(user, mock_api.project_id);
      await projects.assertOrganizationWriteAccess(user, project.organization_id);

      await ctx.db
        .updateTable("mock_apis")
        .set({ deleted_at: new Date() })
        .where("id", "=", id)
        .execute();
    },
    async restoreMockApi(user: AuthenticatedUser, id: string): Promise<void> {
      const mock_api = await ctx.db
        .selectFrom("mock_apis")
        .innerJoin("projects", "projects.id", "mock_apis.project_id")
        .select(["mock_apis.id", "mock_apis.project_id"])
        .where("mock_apis.id", "=", id)
        .where("projects.deleted_at", "is", null)
        .executeTakeFirst();

      if (!mock_api) {
        throw new MockApiException({
          public_message: "Mock API not found.",
          status_code: HttpStatusCode.NOT_FOUND,
        });
      }

      const projects = ProjectsUsecase(ctx);
      const project = await projects.getProject(user, mock_api.project_id);
      await projects.assertOrganizationWriteAccess(user, project.organization_id);

      await ctx.db
        .updateTable("mock_apis")
        .set({ deleted_at: null })
        .where("id", "=", id)
        .execute();
    },
  };
};
