import { randomBytes } from "node:crypto";
import argon2 from "argon2";
import { ServerContext } from "../server";
import { IAuthService, type ProviderIdentity } from "./interfaces/auth_service";
import { AuthIdentitiesRepository } from "../infrastructure/kysely/repositories/auth_identities";
import { AuthorizedSessionsRepository } from "../infrastructure/kysely/repositories/authorized_sessions";
import { UsersRepository } from "../infrastructure/kysely/repositories/users";

const token_length_bytes = 64;
const token_hint_length = 4;
const session_ttl_ms = 7 * 24 * 60 * 60 * 1000;

const createToken = () => randomBytes(token_length_bytes).toString("hex");

export const AuthService = (ctx: ServerContext): IAuthService => {
  const repositories = {
    users: UsersRepository(ctx),
    authIdentities: AuthIdentitiesRepository(ctx),
    authorizedSessions: AuthorizedSessionsRepository(ctx),
  };

  const argon_options = {
    type: argon2.argon2id,
  };

  const createSession = async (
    user_id: string,
  ): Promise<{ token: string; expiresAt: string }> => {
    const token = createToken();
    const tokenHash = await argon2.hash(token, argon_options);
    const expiresAt = new Date(Date.now() + session_ttl_ms);

    await repositories.authorizedSessions.create({
      user_id,
      token_prefix: token.slice(0, token_hint_length),
      token_suffix: token.slice(-token_hint_length),
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

    return {
      token,
      expiresAt: expiresAt.toISOString(),
    };
  };

  const getOrCreateProviderUser = async (input: ProviderIdentity) => {
    const identities = await repositories.authIdentities.list({
      filters: {
        provider: input.provider,
        provider_subject: input.provider_subject,
      },
      columns: ["user_id"],
    });
    const identity = identities.at(0);

    if (identity) {
      const users = await repositories.users.list({
        filters: { ids: [identity.user_id] },
      });
      const user = users.at(0);

      if (user) return user;
    }

    const existingUsers = input.email
      ? await repositories.users.list({ filters: { email: input.email } })
      : [];
    const user =
      existingUsers.at(0) ??
      (await repositories.users.create({
        email: input.email,
        display_name: input.display_name,
        avatar_url: input.avatar_url,
      }));

    await repositories.authIdentities.create({
      provider: input.provider,
      provider_subject: input.provider_subject,
      user_id: user.id,
    });

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

      const sessions =
        await repositories.authorizedSessions.findActiveCandidates({
          token_prefix: token.slice(0, token_hint_length),
          token_suffix: token.slice(-token_hint_length),
          now: new Date(),
        });

      for (const session of sessions) {
        if (await argon2.verify(session.token_hash, token)) {
          return session.user;
        }
      }

      return null;
    },
  };
};
