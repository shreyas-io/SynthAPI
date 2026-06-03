import { randomBytes } from "node:crypto";
import argon2 from "argon2";
import { IAuthService, type ProviderIdentity } from "./interfaces/auth_service";
import type { User } from "./entities/user";
import type { AppContext } from "../server";

const TOKEN_LENGTH_BYTES = 64;
const TOKEN_HINT_LENGTH = 4;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const createToken = () => randomBytes(TOKEN_LENGTH_BYTES).toString("hex");

export const AuthService = (ctx: AppContext): IAuthService => {
  const argon_options = {
    type: argon2.argon2id,
  };

  const createSession = async (
    user_id: string,
  ): Promise<{ token: string; expiresAt: string }> => {
    const token = createToken();
    const tokenHash = await argon2.hash(token, argon_options);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await ctx.db
      .insertInto("authorized_sessions")
      .values({
        user_id,
        token_prefix: token.slice(0, TOKEN_HINT_LENGTH),
        token_suffix: token.slice(-TOKEN_HINT_LENGTH),
        token_hash: tokenHash,
        expires_at: expiresAt,
      })
      .executeTakeFirstOrThrow();

    return {
      token,
      expiresAt: expiresAt.toISOString(),
    };
  };

  const ensureDefaultOrganization = async (user: User): Promise<User> => {
    if (user.default_organization_id) {
      return user;
    }

    return ctx.db.transaction().execute(async (trx) => {
      const freshUser = await trx
        .selectFrom("users")
        .selectAll()
        .where("id", "=", user.id)
        .executeTakeFirst();

      if (!freshUser) {
        return user;
      }

      if (freshUser.default_organization_id) {
        return freshUser;
      }

      const organization = await trx
        .insertInto("organizations")
        .values({
          name:
            freshUser.display_name ?? freshUser.email ?? "Default organization",
          created_by_user_id: freshUser.id,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      await trx
        .updateTable("users")
        .set({
          default_organization_id: organization.id,
        })
        .where("id", "=", freshUser.id)
        .execute();

      await trx
        .insertInto("organization_memberships")
        .values({
          organization_id: organization.id,
          user_id: freshUser.id,
          role: "owner",
          status: "active",
        })
        .executeTakeFirstOrThrow();

      const basicPlan = await trx
        .selectFrom("plan_types")
        .selectAll()
        .where("key", "=", "basic")
        .executeTakeFirst();

      if (!basicPlan) {
        throw new Error("Basic plan type is missing.");
      }

      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setUTCDate(
        expiresAt.getUTCDate() + basicPlan.credit_grant_duration_days,
      );

      const subscription = await trx
        .insertInto("organization_plan_subscriptions")
        .values({
          organization_id: organization.id,
          plan_type_id: basicPlan.id,
          status: "active",
          starts_at: now,
          expires_at: expiresAt,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      await trx
        .insertInto("organization_credit_grants")
        .values({
          organization_id: organization.id,
          grant_type: "ai_credits",
          amount: basicPlan.default_ai_credits,
          source_subscription_id: subscription.id,
          expires_at: subscription.expires_at,
        })
        .executeTakeFirstOrThrow();

      return {
        ...freshUser,
        default_organization_id: organization.id,
      };
    });
  };

  const getOrCreateProviderUser = async (input: ProviderIdentity) => {
    const identity = await ctx.db
      .selectFrom("auth_identities")
      .select(["user_id"])
      .where("provider", "=", input.provider)
      .where("provider_subject", "=", input.provider_subject)
      .executeTakeFirst();

    if (identity) {
      const user = await ctx.db
        .selectFrom("users")
        .selectAll()
        .where("id", "=", identity.user_id)
        .executeTakeFirst();

      if (user) return ensureDefaultOrganization(user);
    }

    const existingUser = input.email
      ? await ctx.db
          .selectFrom("users")
          .selectAll()
          .where("email", "=", input.email)
          .executeTakeFirst()
      : undefined;

    const user =
      existingUser ??
      (await ctx.db
        .insertInto("users")
        .values({
          email: input.email,
          display_name: input.display_name,
          avatar_url: input.avatar_url,
        })
        .returningAll()
        .executeTakeFirstOrThrow());

    await ctx.db
      .insertInto("auth_identities")
      .values({
        provider: input.provider,
        provider_subject: input.provider_subject,
        user_id: user.id,
      })
      .executeTakeFirstOrThrow();

    return ensureDefaultOrganization(user);
  };

  return {
    async signinWithProviderIdentity(input) {
      const user = await getOrCreateProviderUser(input);
      return createSession(user.id);
    },
    async validateToken(token) {
      if (!/^[a-f0-9]{128}$/.test(token)) {
        return null;
      }

      const sessions = await ctx.db
        .selectFrom("authorized_sessions")
        .innerJoin("users", "users.id", "authorized_sessions.user_id")
        .select([
          "users.id as user_id",
          "users.email as email",
          "users.display_name as display_name",
          "users.avatar_url as avatar_url",
          "users.default_organization_id as default_organization_id",
          "authorized_sessions.token_hash as token_hash",
        ])
        .where(
          "authorized_sessions.token_prefix",
          "=",
          token.slice(0, TOKEN_HINT_LENGTH),
        )
        .where(
          "authorized_sessions.token_suffix",
          "=",
          token.slice(-TOKEN_HINT_LENGTH),
        )
        .where("authorized_sessions.expires_at", ">", new Date())
        .execute();

      for (const session of sessions) {
        if (await argon2.verify(session.token_hash, token)) {
          return {
            id: session.user_id,
            email: session.email,
            display_name: session.display_name,
            avatar_url: session.avatar_url,
            default_organization_id: session.default_organization_id,
          };
        }
      }

      return null;
    },
  };
};
