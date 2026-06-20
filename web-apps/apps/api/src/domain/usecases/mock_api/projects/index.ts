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
  search?: string | undefined;
  fetch_deleted?: boolean | undefined;
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

  const assertOrganizationWriteAccess = async (
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
      .select(["organization_memberships.id", "organization_memberships.role"])
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

    if (membership.role === "viewer") {
      throw new MockApiException({
        public_message: "Viewers cannot modify resources in this organization.",
        status_code: HttpStatusCode.FORBIDDEN,
      });
    }

    return organizationId;
  };

  return {
    assertOrganizationAccess,
    assertOrganizationWriteAccess,
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
      const validated_org_id = await assertOrganizationWriteAccess(
        user,
        organization_id,
      );

      const project = await ctx.db
        .insertInto("projects")
        .values({
          organization_id: validated_org_id,
          created_by_user_id: user.id,
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
        .where("deleted_at", "is", null)
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
          | "id"
          | "organization_id"
          | "created_by_user_id"
          | "slug"
          | "name"
          | "description"
          | "deleted_at"
          | "deleted_by_user_id"
          | "created_at"
        >
        & {
          created_by: {
            display_name: string | null;
            avatar_url: string | null;
          };
          deleted_by: {
            display_name: string | null;
            avatar_url: string | null;
          } | null;
        }
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
        .innerJoin("users", "users.id", "projects.created_by_user_id")
        .leftJoin("users as deleted_by_user", "deleted_by_user.id", "projects.deleted_by_user_id")
        .select([
          "projects.id as id",
          "projects.organization_id as organization_id",
          "projects.created_by_user_id as created_by_user_id",
          "projects.slug as slug",
          "projects.name as name",
          "projects.description as description",
          "projects.deleted_at as deleted_at",
          "projects.deleted_by_user_id as deleted_by_user_id",
          "projects.created_at as created_at",
          "users.display_name as created_by_display_name",
          "users.avatar_url as created_by_avatar_url",
          "deleted_by_user.display_name as deleted_by_display_name",
          "deleted_by_user.avatar_url as deleted_by_avatar_url",
        ]);

      if (scopedFilters.ids?.length) {
        countQuery = countQuery.where("id", "in", scopedFilters.ids);
        recordsQuery = recordsQuery.where("projects.id", "in", scopedFilters.ids);
      }

      if (scopedFilters.organization_ids?.length) {
        countQuery = countQuery.where(
          "organization_id",
          "in",
          scopedFilters.organization_ids,
        );
        recordsQuery = recordsQuery.where(
          "projects.organization_id",
          "in",
          scopedFilters.organization_ids,
        );
      }

      if (scopedFilters.slug) {
        countQuery = countQuery.where("slug", "=", scopedFilters.slug);
        recordsQuery = recordsQuery.where("projects.slug", "=", scopedFilters.slug);
      }

      if (scopedFilters.name) {
        countQuery = countQuery.where(
          "name",
          "ilike",
          `%${scopedFilters.name}%`,
        );
        recordsQuery = recordsQuery.where(
          "projects.name",
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
          "projects.description",
          "ilike",
          `%${scopedFilters.description}%`,
        );
      }

      if (scopedFilters.search) {
        countQuery = countQuery.where((eb) =>
          eb.or([
            eb("name", "ilike", `%${scopedFilters.search}%`),
            eb("description", "ilike", `%${scopedFilters.search}%`),
          ])
        );
        recordsQuery = recordsQuery.where((eb) =>
          eb.or([
            eb("projects.name", "ilike", `%${scopedFilters.search}%`),
            eb("projects.description", "ilike", `%${scopedFilters.search}%`),
          ])
        );
      }

      if (scopedFilters.fetch_deleted) {
        countQuery = countQuery.where("deleted_at", "is not", null);
        recordsQuery = recordsQuery.where("projects.deleted_at", "is not", null);
      } else {
        countQuery = countQuery.where("deleted_at", "is", null);
        recordsQuery = recordsQuery.where("projects.deleted_at", "is", null);
      }

      recordsQuery = recordsQuery
        .orderBy(`projects.${sort.by}`, sort.order)
        .limit(pagination.limit)
        .offset(pagination.offset);

      const [total, records] = await Promise.all([
        countQuery.executeTakeFirstOrThrow().then((row) => row.count),
        recordsQuery.execute(),
      ]);

      return {
        total,
        records: records.map((record) => ({
          id: record.id,
          organization_id: record.organization_id,
          created_by_user_id: record.created_by_user_id,
          slug: record.slug,
          name: record.name,
          description: record.description,
          deleted_at: record.deleted_at,
          deleted_by_user_id: record.deleted_by_user_id,
          created_at: record.created_at,
          created_by: {
            display_name: record.created_by_display_name,
            avatar_url: record.created_by_avatar_url,
          },
          deleted_by: record.deleted_by_user_id
            ? {
                display_name: record.deleted_by_display_name,
                avatar_url: record.deleted_by_avatar_url,
              }
            : null,
        })),
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
        .where("deleted_at", "is", null)
        .executeTakeFirst();

      if (!project) {
        throw new MockApiException({
          public_message: "Project not found.",
          status_code: HttpStatusCode.NOT_FOUND,
        });
      }

      await assertOrganizationWriteAccess(user, project.organization_id);

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
        .select(["id", "organization_id", "deleted_at"])
        .where("id", "=", id)
        .executeTakeFirst();

      if (!project) {
        throw new MockApiException({
          public_message: "Project not found.",
          status_code: HttpStatusCode.NOT_FOUND,
        });
      }

      await assertOrganizationWriteAccess(user, project.organization_id);

      if (project.deleted_at) {
        return;
      }

      await ctx.db
        .updateTable("projects")
        .set({ deleted_at: new Date(), deleted_by_user_id: user.id })
        .where("id", "=", id)
        .execute();
    },
    restoreProject: async (
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

      await assertOrganizationWriteAccess(user, project.organization_id);

      await ctx.db
        .updateTable("projects")
        .set({ deleted_at: null, deleted_by_user_id: null })
        .where("id", "=", id)
        .execute();
    },
  };
};
