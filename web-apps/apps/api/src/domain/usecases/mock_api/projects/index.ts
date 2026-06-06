import type { AppContext } from "../../../../server";
import { sql } from "kysely";
import {
  HttpStatusCode,
  MockApiException,
} from "../../../exceptions/exception";
import type { AuthenticatedUser } from "../../../entities/authenticated_user";
import type { ProjectEt } from "../../../entities/project";

type ProjectFilters = {
  ids?: string[] | undefined;
  organization_ids?: string[] | undefined;
  slug?: string | undefined;
  name?: string | undefined;
  description?: string | undefined;
};

type ProjectPagination = {
  limit: number;
  offset: number;
};

type ProjectSort = {
  by: "name" | "created_at";
  order: "asc" | "desc";
};

export const ProjectsUsecase = (ctx: AppContext) => {
  const getAccessibleOrganizationId = async (
    user: AuthenticatedUser,
  ): Promise<string> => {
    const organizationId = user.default_organization_id;

    if (!organizationId) {
      throw new MockApiException({
        public_message: "Default organization not found.",
        status_code: HttpStatusCode.FORBIDDEN,
      });
    }

    const membership = await ctx.db
      .selectFrom("organization_memberships")
      .innerJoin(
        "organizations",
        "organizations.id",
        "organization_memberships.organization_id",
      )
      .select(["organization_memberships.id"])
      .where("organization_memberships.organization_id", "=", organizationId)
      .where("organizations.deleted_at", "is", null)
      .where("organization_memberships.user_id", "=", user.id)
      .where("organization_memberships.status", "=", "active")
      .executeTakeFirst();

    if (!membership) {
      throw new MockApiException({
        public_message: "You do not have access to this organization.",
        status_code: HttpStatusCode.FORBIDDEN,
      });
    }

    return organizationId;
  };

  return {
    createProject: async (
      user: AuthenticatedUser,
      input: Pick<
        ProjectEt,
        "slug" | "name" | "description" | "globals" | "constants"
      >,
    ) => {
      const organizationId = await getAccessibleOrganizationId(user);
      const project = await ctx.db
        .insertInto("projects")
        .values({
          organization_id: organizationId,
          slug: input.slug,
          name: input.name,
          description: input.description,
          ...(input.globals ? { globals: JSON.stringify(input.globals) } : {}),
          ...(input.constants
            ? { constants: JSON.stringify(input.constants) }
            : {}),
        })
        .returningAll()
        .executeTakeFirst();

      if (!project) {
        throw new MockApiException({
          public_message: "Error encountered while creating project.",
        });
      }

      return project;
    },
    getProject: async (
      user: AuthenticatedUser,
      id: string,
    ): Promise<ProjectEt> => {
      const organizationId = await getAccessibleOrganizationId(user);
      const project = await ctx.db
        .selectFrom("projects")
        .selectAll()
        .where("id", "=", id)
        .where("organization_id", "=", organizationId)
        .executeTakeFirst();
      if (!project) {
        throw new MockApiException({
          public_message: "Project not found.",
          status_code: HttpStatusCode.NOT_FOUND,
        });
      }

      return project;
    },
    getProjects: async (
      user: AuthenticatedUser,
      filters: ProjectFilters,
      pagination: ProjectPagination,
      sort: ProjectSort,
    ) => {
      const organizationId = await getAccessibleOrganizationId(user);
      const scopedFilters = {
        ...filters,
        organization_ids: [organizationId],
      };
      let countQuery = ctx.db
        .selectFrom("projects")
        .select(sql<number>`count(*)::int`.as("count"));
      let recordsQuery = ctx.db
        .selectFrom("projects")
        .select(["id", "organization_id", "slug", "name", "description"]);

      if (scopedFilters.ids?.length) {
        countQuery = countQuery.where("id", "in", scopedFilters.ids);
        recordsQuery = recordsQuery.where("id", "in", scopedFilters.ids);
      }

      if (scopedFilters.organization_ids?.length) {
        countQuery = countQuery.where(
          "organization_id",
          "in",
          scopedFilters.organization_ids,
        );
        recordsQuery = recordsQuery.where(
          "organization_id",
          "in",
          scopedFilters.organization_ids,
        );
      }

      if (scopedFilters.slug) {
        countQuery = countQuery.where("slug", "=", scopedFilters.slug);
        recordsQuery = recordsQuery.where("slug", "=", scopedFilters.slug);
      }

      if (scopedFilters.name) {
        countQuery = countQuery.where("name", "ilike", `%${scopedFilters.name}%`);
        recordsQuery = recordsQuery.where("name", "ilike", `%${scopedFilters.name}%`);
      }

      if (scopedFilters.description) {
        countQuery = countQuery.where(
          "description",
          "ilike",
          `%${scopedFilters.description}%`,
        );
        recordsQuery = recordsQuery.where(
          "description",
          "ilike",
          `%${scopedFilters.description}%`,
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
    updateProject: async (
      user: AuthenticatedUser,
      id: string,
      input: Pick<
        ProjectEt,
        "name" | "description" | "globals" | "constants"
      >,
    ): Promise<void> => {
      const organizationId = await getAccessibleOrganizationId(user);
      const project = await ctx.db
        .selectFrom("projects")
        .select(["id"])
        .where("id", "=", id)
        .where("organization_id", "=", organizationId)
        .executeTakeFirst();

      if (!project) {
        throw new MockApiException({
          public_message: "Project not found.",
          status_code: HttpStatusCode.NOT_FOUND,
        });
      }

      await ctx.db
        .updateTable("projects")
        .set({
          name: input.name,
          description: input.description,
          ...(input.globals ? { globals: JSON.stringify(input.globals) } : {}),
          ...(input.constants
            ? { constants: JSON.stringify(input.constants) }
            : {}),
        })
        .where("id", "=", id)
        .execute();
    },
    deleteProject: async (
      user: AuthenticatedUser,
      id: string,
    ): Promise<void> => {
      const organizationId = await getAccessibleOrganizationId(user);
      const project = await ctx.db
        .selectFrom("projects")
        .select(["id"])
        .where("id", "=", id)
        .where("organization_id", "=", organizationId)
        .executeTakeFirst();

      if (!project) {
        throw new MockApiException({
          public_message: "Project not found.",
          status_code: HttpStatusCode.NOT_FOUND,
        });
      }

      await ctx.db
        .deleteFrom("projects")
        .where("id", "=", id)
        .execute();
    },
  };
};
