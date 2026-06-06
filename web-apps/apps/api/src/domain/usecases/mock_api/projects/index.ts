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
  organization_id?: string | undefined;
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
  const getDefaultOrganizationId = async (
    userId: string,
  ): Promise<string | null> => {
    const org = await ctx.db
      .selectFrom("organizations")
      .select("id")
      .where("created_by_user_id", "=", userId)
      .where("is_default_for_owner", "=", true)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return org?.id ?? null;
  };

  const assertOrganizationAccess = async (
    user: AuthenticatedUser,
    organizationId: string,
  ): Promise<string> => {
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
        | "slug"
        | "name"
        | "description"
        | "globals"
        | "constants"
        | "organization_id"
      >,
    ) => {
      const organization_id = input.organization_id;
      const validated_org_id = await assertOrganizationAccess(
        user,
        organization_id,
      );

      const project = await ctx.db
        .insertInto("projects")
        .values({
          organization_id: validated_org_id,
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
      const project = await ctx.db
        .selectFrom("projects")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();

      if (!project) {
        throw new MockApiException({
          public_message: "Project not found.",
          status_code: HttpStatusCode.NOT_FOUND,
        });
      }

      await assertOrganizationAccess(user, project.organization_id);

      return project;
    },
    getProjects: async (
      user: AuthenticatedUser,
      filters: ProjectFilters,
      pagination: ProjectPagination,
      sort: ProjectSort,
    ): Promise<{
      total: number;
      records: Array<
        Pick<
          ProjectEt,
          "id" | "organization_id" | "slug" | "name" | "description"
        >
      >;
    }> => {
      let organization_id = filters.organization_id;
      if (!organization_id) {
        organization_id = (await getDefaultOrganizationId(user.id)) ?? undefined;
      }
      if (!organization_id) {
        return {
          total: 0,
          records: [],
        };
      }
      await assertOrganizationAccess(user, organization_id);

      const scopedFilters = {
        ...filters,
        organization_ids: [organization_id],
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
        countQuery = countQuery.where(
          "name",
          "ilike",
          `%${scopedFilters.name}%`,
        );
        recordsQuery = recordsQuery.where(
          "name",
          "ilike",
          `%${scopedFilters.name}%`,
        );
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
      input: Pick<ProjectEt, "name" | "description" | "globals" | "constants">,
    ): Promise<void> => {
      const project = await ctx.db
        .selectFrom("projects")
        .select(["id", "organization_id"])
        .where("id", "=", id)
        .executeTakeFirst();

      if (!project) {
        throw new MockApiException({
          public_message: "Project not found.",
          status_code: HttpStatusCode.NOT_FOUND,
        });
      }

      await assertOrganizationAccess(user, project.organization_id);

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
      const project = await ctx.db
        .selectFrom("projects")
        .select(["id", "organization_id"])
        .where("id", "=", id)
        .executeTakeFirst();

      if (!project) {
        throw new MockApiException({
          public_message: "Project not found.",
          status_code: HttpStatusCode.NOT_FOUND,
        });
      }

      await assertOrganizationAccess(user, project.organization_id);

      await ctx.db.deleteFrom("projects").where("id", "=", id).execute();
    },
  };
};
