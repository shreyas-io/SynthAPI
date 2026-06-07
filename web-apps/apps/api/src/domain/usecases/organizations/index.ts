import type { AppContext } from "../../../server";
import type { AuthenticatedUser } from "../../entities/authenticated_user";
import { HttpStatusCode, MockApiException } from "../../exceptions/exception";
import { seed_default_project } from "../mock_api/projects/seed_default_project";
import {
  createOrganizationPlanSubscription,
  getOrganizationAiCreditBalance,
} from "./plans";

const MAX_OWNED_ORGANIZATIONS = 3;
const DELETED_ORGANIZATION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export const OrganizationsUsecase = (ctx: AppContext) => {
  const assertOwnerMembership = async (
    user: AuthenticatedUser,
    organization_id: string,
  ) => {
    const organization = await ctx.db
      .selectFrom("organizations")
      .innerJoin(
        "organization_memberships",
        "organization_memberships.organization_id",
        "organizations.id",
      )
      .select([
        "organizations.id as id",
        "organizations.deleted_at as deleted_at",
      ])
      .where("organizations.id", "=", organization_id)
      .where("organization_memberships.user_id", "=", user.id)
      .where("organization_memberships.role", "=", "owner")
      .where("organization_memberships.status", "=", "active")
      .executeTakeFirst();

    if (!organization) {
      throw new MockApiException({
        public_message: "Organization not found.",
        status_code: HttpStatusCode.NOT_FOUND,
      });
    }

    return organization;
  };

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

  return {
    getUserProfile: async (user: AuthenticatedUser) => {
      const defaultOrganizationId = await getDefaultOrganizationId(user.id);

      const organizations = await ctx.db
        .selectFrom("organization_memberships")
        .innerJoin(
          "organizations",
          "organizations.id",
          "organization_memberships.organization_id",
        )
        .leftJoin("organization_plan_subscriptions", (join) =>
          join
            .onRef(
              "organization_plan_subscriptions.organization_id",
              "=",
              "organizations.id",
            )
            .on("organization_plan_subscriptions.status", "=", "active"),
        )
        .leftJoin(
          "plan_types",
          "plan_types.id",
          "organization_plan_subscriptions.plan_type_id",
        )
        .select([
          "organizations.id as organization_id",
          "organizations.name as organization_name",
          "organizations.created_by_user_id as created_by_user_id",
          "organizations.deleted_at as deleted_at",
          "organizations.created_at as organization_created_at",
          "organizations.updated_at as organization_updated_at",
          "organization_memberships.role as role",
          "organization_memberships.status as membership_status",
          "organization_memberships.stale_reason as stale_reason",
          "organization_memberships.staled_at as staled_at",
          "organization_plan_subscriptions.id as subscription_id",
          "organization_plan_subscriptions.status as subscription_status",
          "organization_plan_subscriptions.starts_at as plan_starts_at",
          "organization_plan_subscriptions.expires_at as plan_expires_at",
          "plan_types.key as plan_key",
          "plan_types.name as plan_name",
          "plan_types.max_org_members as max_org_members",
          "plan_types.default_ai_credits as default_ai_credits",
        ])
        .where("organization_memberships.user_id", "=", user.id)
        .orderBy("organizations.created_at", "asc")
        .execute();

      const records = await Promise.all(
        organizations.map(async (organization) => {
          const credits = await getOrganizationAiCreditBalance(
            ctx.db,
            organization.organization_id,
          );

          return {
            id: organization.organization_id,
            name: organization.organization_name,
            created_by_user_id: organization.created_by_user_id,
            deleted_at: organization.deleted_at,
            created_at: organization.organization_created_at,
            updated_at: organization.organization_updated_at,
            membership: {
              role: organization.role,
              status: organization.membership_status,
              stale_reason: organization.stale_reason,
              staled_at: organization.staled_at,
            },
            plan: organization.subscription_id
              ? {
                  subscription_id: organization.subscription_id,
                  key: organization.plan_key,
                  name: organization.plan_name,
                  status: organization.subscription_status,
                  starts_at: organization.plan_starts_at,
                  expires_at: organization.plan_expires_at,
                  max_org_members: organization.max_org_members,
                  default_ai_credits: organization.default_ai_credits,
                }
              : null,
            ai_credits: credits,
          };
        }),
      );

      return {
        user: {
          id: user.id,
          email: user.email,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          default_organization_id: defaultOrganizationId,
        },
        organizations: records,
      };
    },
    createOrganization: async (
      user: AuthenticatedUser,
      input: { name: string },
    ) => {
      const ownedOrganizations = await ctx.db
        .selectFrom("organizations")
        .select((eb) => eb.fn.count<number>("id").as("count"))
        .where("created_by_user_id", "=", user.id)
        .where("deleted_at", "is", null)
        .executeTakeFirstOrThrow();

      if (Number(ownedOrganizations.count) >= MAX_OWNED_ORGANIZATIONS) {
        throw new MockApiException({
          public_message: "Organization limit reached.",
          status_code: HttpStatusCode.FORBIDDEN,
        });
      }

      const organization = await ctx.db.transaction().execute(async (trx) => {
        const organization = await trx
          .insertInto("organizations")
          .values({
            name: input.name,
            created_by_user_id: user.id,
            is_default_for_owner: false,
          })
          .returningAll()
          .executeTakeFirstOrThrow();

        await trx
          .insertInto("organization_memberships")
          .values({
            organization_id: organization.id,
            user_id: user.id,
            role: "owner",
            status: "active",
          })
          .executeTakeFirstOrThrow();

        await createOrganizationPlanSubscription(trx, {
          organization_id: organization.id,
          plan_key: "basic",
        });

        return organization;
      });

      return organization;
    },
    deleteOrganization: async (
      user: AuthenticatedUser,
      organization_id: string,
    ): Promise<void> => {
      const organization = await assertOwnerMembership(user, organization_id);

      if (organization.deleted_at) {
        return;
      }

      await ctx.db
        .updateTable("organizations")
        .set({ deleted_at: new Date() })
        .where("id", "=", organization_id)
        .execute();
    },
    restoreOrganization: async (
      user: AuthenticatedUser,
      organization_id: string,
    ): Promise<void> => {
      await assertOwnerMembership(user, organization_id);

      await ctx.db
        .updateTable("organizations")
        .set({ deleted_at: null })
        .where("id", "=", organization_id)
        .execute();
    },
  };
};

export const deleteExpiredDeletedOrganizations = async (
  ctx: AppContext,
): Promise<number> => {
  const cutoff = new Date(Date.now() - DELETED_ORGANIZATION_RETENTION_MS);
  const deletedOrganizations = await ctx.db
    .deleteFrom("organizations")
    .where("deleted_at", "is not", null)
    .where("deleted_at", "<=", cutoff)
    .returning("id")
    .execute();

  return deletedOrganizations.length;
};
