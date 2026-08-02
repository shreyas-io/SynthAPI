import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { IAuthService, type ProviderIdentity } from "./interfaces/auth_service";
import type { User } from "./entities/user";
import type { AppContext } from "../context";
import { seed_default_project } from "./usecases/mock_api/projects/seed_default_project";
import { createOrganizationPlanSubscription } from "./usecases/organizations/plans";

const TOKEN_LENGTH_BYTES = 64;
const TOKEN_HINT_LENGTH = 4;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const createToken = () => randomBytes(TOKEN_LENGTH_BYTES).toString("hex");

export const AuthService = (ctx: AppContext): IAuthService => {
  const createSession = async (
    user_id: string,
  ): Promise<{ token: string; expiresAt: string }> => {
    const token = createToken();
    const tokenHash = await bcrypt.hash(token, 10);
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

      if (user) return user;
    }

    const existingUser = input.email
      ? await ctx.db
          .selectFrom("users")
          .selectAll()
          .where("email", "=", input.email)
          .executeTakeFirst()
      : undefined;

    if (existingUser) {
      await ctx.db
        .insertInto("auth_identities")
        .values({
          provider: input.provider,
          provider_subject: input.provider_subject,
          user_id: existingUser.id,
        })
        .executeTakeFirstOrThrow();

      return existingUser;
    }

    const { user, organization_id } = await ctx.db
      .transaction()
      .execute(async (trx) => {
        const createdUser = await trx
          .insertInto("users")
          .values({
            email: input.email,
            display_name: input.display_name,
            avatar_url: input.avatar_url,
          })
          .returningAll()
          .executeTakeFirstOrThrow();

        const organization = await trx
          .insertInto("organizations")
          .values({
            name: "Default organization",
            created_by_user_id: createdUser.id,
            is_default_for_owner: true,
          })
          .returningAll()
          .executeTakeFirstOrThrow();

        await trx
          .insertInto("organization_memberships")
          .values({
            organization_id: organization.id,
            user_id: createdUser.id,
            role: "owner",
            status: "active",
          })
          .executeTakeFirstOrThrow();

        await createOrganizationPlanSubscription(trx, {
          organization_id: organization.id,
          plan_key: "plus",
        });

        await trx
          .insertInto("auth_identities")
          .values({
            provider: input.provider,
            provider_subject: input.provider_subject,
            user_id: createdUser.id,
          })
          .executeTakeFirstOrThrow();

        return { user: createdUser, organization_id: organization.id };
      });

    await seed_default_project(ctx, user, organization_id);

    return user;
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
        if (await bcrypt.compare(token, session.token_hash)) {
          return {
            id: session.user_id,
            email: session.email,
            display_name: session.display_name,
            avatar_url: session.avatar_url,
          };
        }
      }

      return null;
    },
  };
};
