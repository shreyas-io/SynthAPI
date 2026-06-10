import { sql } from "kysely";
import type { AppContext } from "../../../server";
import type { AuthenticatedUser } from "../../entities/authenticated_user";
import { OrganizationInviteEt } from "../../entities/organization";
import { HttpStatusCode, MockApiException } from "../../exceptions/exception";
import { seed_default_project } from "../mock_api/projects/seed_default_project";
import {
  createOrganizationPlanSubscription,
  getOrganizationAiCreditBalance,
  assertOrganizationCanAddMember,
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

  const getMembership = async (
    user: AuthenticatedUser,
    organization_id: string,
  ) => {
    const membership = await ctx.db
      .selectFrom("organization_memberships")
      .select(["role", "status", "created_at"])
      .where("organization_id", "=", organization_id)
      .where("user_id", "=", user.id)
      .executeTakeFirst();

    if (!membership || membership.status !== "active") {
      throw new MockApiException({
        public_message: "You are not an active member of this organization.",
        status_code: HttpStatusCode.FORBIDDEN,
      });
    }

    return membership;
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
    addMember: async (
      user: AuthenticatedUser,
      organization_id: string,
      target_user_email: string,
      role: "admin" | "member",
    ) => {
      const membership = await getMembership(user, organization_id);

      if (membership.role === "member") {
        throw new MockApiException({
          public_message: "Only owners and admins can invite members.",
          status_code: HttpStatusCode.FORBIDDEN,
        });
      }

      if (membership.role !== "owner" && role !== "member") {
        throw new MockApiException({
          public_message: "Only owners can invite admins.",
          status_code: HttpStatusCode.FORBIDDEN,
        });
      }

      const organization = await ctx.db
        .selectFrom("organizations")
        .select(["name", "is_default_for_owner"])
        .where("id", "=", organization_id)
        .executeTakeFirstOrThrow();

      await assertOrganizationCanAddMember(ctx.db, organization_id);

      // Check if user is already a member
      const targetUser = await ctx.db
        .selectFrom("users")
        .select("id")
        .where("email", "=", target_user_email)
        .executeTakeFirst();

      if (targetUser) {
        const existingMembership = await ctx.db
          .selectFrom("organization_memberships")
          .select(sql<number>`count(*)::int`.as("count"))
          .where("organization_id", "=", organization_id)
          .where("user_id", "=", targetUser.id)
          .executeTakeFirst();

        if (existingMembership?.count && existingMembership?.count > 0) {
          throw new MockApiException({
            public_message: "User is already a member of this organization.",
            status_code: HttpStatusCode.CONFLICT,
          });
        }
      }

      // Check for existing pending invite
      const existingInvite = await ctx.db
        .selectFrom("organization_invites")
        .select("id")
        .where("organization_id", "=", organization_id)
        .where("email", "=", target_user_email)
        .where("status", "=", "pending")
        .executeTakeFirst();

      if (existingInvite) {
        throw new MockApiException({
          public_message: "An invite is already pending for this email.",
          status_code: HttpStatusCode.CONFLICT,
        });
      }

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const invite = await ctx.db
        .insertInto("organization_invites")
        .values({
          organization_id,
          email: target_user_email,
          invited_by_user_id: user.id,
          role,
          status: "pending",
          expires_at: expiresAt,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      await ctx.emailService.sendOrganizationInvite({
        to: target_user_email,
        organizationName: organization.name,
        invitedBy: user.display_name ?? (user.email || "Someone"),
        inviteUrl: `${ctx.env.WEB_APP_BASE_URL}/invites/${invite.id}`,
      });

      return invite;
    },
    acceptInvite: async (user: AuthenticatedUser, inviteId: string) => {
      const invite = await ctx.db
        .selectFrom("organization_invites")
        .selectAll()
        .where("id", "=", inviteId)
        .executeTakeFirst();

      if (!invite) {
        throw new MockApiException({
          public_message: "Invite not found.",
          status_code: HttpStatusCode.NOT_FOUND,
        });
      }

      if (invite.status !== "pending" || invite.expires_at <= new Date()) {
        throw new MockApiException({
          public_message: "Invite is no longer valid.",
          status_code: HttpStatusCode.BAD_REQUEST,
        });
      }

      if (invite.email !== user.email) {
        throw new MockApiException({
          public_message: "This invite was not sent to your email address.",
          status_code: HttpStatusCode.FORBIDDEN,
        });
      }

      await ctx.db.transaction().execute(async (trx) => {
        await assertOrganizationCanAddMember(trx, invite.organization_id);

        await trx
          .insertInto("organization_memberships")
          .values({
            organization_id: invite.organization_id,
            user_id: user.id,
            role: invite.role,
            status: "active",
          })
          .execute();

        await trx
          .updateTable("organization_invites")
          .set({ status: "accepted" })
          .where("id", "=", inviteId)
          .execute();
      });
    },
    revokeInvite: async (
      user: AuthenticatedUser,
      organization_id: string,
      inviteId: string,
    ) => {
      const membership = await getMembership(user, organization_id);

      if (membership.role !== "owner" && membership.role !== "admin") {
        throw new MockApiException({
          public_message: "Only owners and admins can revoke invites.",
          status_code: HttpStatusCode.FORBIDDEN,
        });
      }

      const invite = await ctx.db
        .selectFrom("organization_invites")
        .select(["role"])
        .where("id", "=", inviteId)
        .where("organization_id", "=", organization_id)
        .executeTakeFirst();

      if (!invite) {
        throw new MockApiException({
          public_message: "Invite not found.",
          status_code: HttpStatusCode.NOT_FOUND,
        });
      }

      if (membership.role === "admin" && invite.role !== "member") {
        throw new MockApiException({
          public_message: "Admins can only revoke member invites.",
          status_code: HttpStatusCode.FORBIDDEN,
        });
      }

      await ctx.db
        .updateTable("organization_invites")
        .set({ status: "revoked" })
        .where("id", "=", inviteId)
        .execute();
    },
    removeMember: async (
      user: AuthenticatedUser,
      organization_id: string,
      target_user_id: string,
    ) => {
      const membership = await getMembership(user, organization_id);

      if (membership.role !== "owner" && membership.role !== "admin") {
        throw new MockApiException({
          public_message: "Only owners and admins can remove members.",
          status_code: HttpStatusCode.FORBIDDEN,
        });
      }

      const targetMembership = await ctx.db
        .selectFrom("organization_memberships")
        .select(["role"])
        .where("organization_id", "=", organization_id)
        .where("user_id", "=", target_user_id)
        .executeTakeFirst();

      if (!targetMembership) {
        throw new MockApiException({
          public_message: "Member not found.",
          status_code: HttpStatusCode.NOT_FOUND,
        });
      }

      if (membership.role === "admin") {
        if (
          targetMembership.role === "owner" ||
          targetMembership.role === "admin"
        ) {
          throw new MockApiException({
            public_message: "Admins can only remove members.",
            status_code: HttpStatusCode.FORBIDDEN,
          });
        }
      }

      if (target_user_id === user.id && membership.role === "owner") {
        throw new MockApiException({
          public_message:
            "Owner cannot remove themselves. Delete the organization instead.",
          status_code: HttpStatusCode.FORBIDDEN,
        });
      }

      await ctx.db
        .deleteFrom("organization_memberships")
        .where("organization_id", "=", organization_id)
        .where("user_id", "=", target_user_id)
        .execute();
    },
    leaveOrganization: async (
      user: AuthenticatedUser,
      organization_id: string,
    ) => {
      const membership = await getMembership(user, organization_id);

      if (membership.role === "owner") {
        throw new MockApiException({
          public_message:
            "Owners cannot leave an organization they own. Delete it instead.",
          status_code: HttpStatusCode.FORBIDDEN,
        });
      }

      await ctx.db
        .deleteFrom("organization_memberships")
        .where("organization_id", "=", organization_id)
        .where("user_id", "=", user.id)
        .execute();
    },
    getMembers: async (user: AuthenticatedUser, organization_id: string) => {
      const membership = await getMembership(user, organization_id);
      if (membership.role === "member") {
        return [
          {
            avatar_url: user.avatar_url,
            display_name: user.display_name,
            email: user.email,
            id: user.id,
            joined_at: membership.created_at,
            role: membership.role,
            status: membership.status,
          },
        ];
      }

      const members = await ctx.db
        .selectFrom("organization_memberships")
        .innerJoin("users", "users.id", "organization_memberships.user_id")
        .select([
          "users.id as id",
          "users.display_name as display_name",
          "users.email as email",
          "users.avatar_url as avatar_url",
          "organization_memberships.role as role",
          "organization_memberships.status as status",
          "organization_memberships.created_at as joined_at",
        ])
        .where("organization_memberships.organization_id", "=", organization_id)
        .where("organization_memberships.role", "in", ["admin", "owner"])
        .execute();

      return members;
    },
    getInvites: async (
      user: AuthenticatedUser,
      organization_id: string,
      status: OrganizationInviteEt["status"],
    ) => {
      const membership = await getMembership(user, organization_id);
      if (membership.role === "member") {
        return [];
      }

      const invites = await ctx.db
        .selectFrom("organization_invites")
        .innerJoin(
          "users",
          "users.id",
          "organization_invites.invited_by_user_id",
        )
        .select([
          "organization_invites.id as id",
          "organization_invites.email as email",
          "organization_invites.role as role",
          "organization_invites.status as status",
          "organization_invites.expires_at as expires_at",
          "organization_invites.created_at as created_at",
          "users.display_name as invited_by_name",
        ])
        .where("organization_invites.organization_id", "=", organization_id)
        .where("organization_invites.status", "=", "pending")
        .where("organization_invites.expires_at", ">", new Date())
        .where("organization_invites.status", "=", status)
        .orderBy("organization_invites.created_at", "desc")
        .execute();

      return invites;
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
