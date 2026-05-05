import { randomBytes } from "node:crypto";
import argon2 from "argon2";
import { ApiGatewayException } from "./exceptions/exception";
import { ServerContext } from "../server";
import { IAuthService } from "./interfaces/auth_service";
import { AuthorizedSessionsRepository } from "../infrastructure/kysely/repositories/authorized_sessions";
import { UsersRepository } from "../infrastructure/kysely/repositories/users";

const token_length_bytes = 64;
const token_hint_length = 4;
const session_ttl_ms = 7 * 24 * 60 * 60 * 1000;

const createToken = () => randomBytes(token_length_bytes).toString("hex");

export const AuthService = (ctx: ServerContext): IAuthService => {
  const repositories = {
    users: UsersRepository(ctx),
    authorizedSessions: AuthorizedSessionsRepository(ctx),
  };

  const argon_options = {
    type: argon2.argon2id,
  };

  return {
    async signup(input) {
      const username = input.username.trim();
      const passwordHash = await argon2.hash(input.password, argon_options);

      try {
        const user = await repositories.users.create({
          username,
          password_hash: passwordHash,
        });

        return {
          id: user.id,
          username: user.username,
        };
      } catch (error) {
        if (error instanceof ApiGatewayException) throw error;

        throw new ApiGatewayException({
          public_message: "Some error occurred",
          cause: error,
        });
      }
    },
    async signin(input) {
      const username = input.username.trim();

      const user = await repositories.users.findByUsername(username);

      if (!user) {
        return null;
      }

      const passwordMatches = await argon2.verify(
        user.password_hash,
        input.password,
      );

      if (!passwordMatches) {
        return null;
      }

      const token = createToken();
      const tokenHash = await argon2.hash(token, argon_options);
      const expiresAt = new Date(Date.now() + session_ttl_ms);

      await repositories.authorizedSessions.create({
        user_id: user.id,
        token_prefix: token.slice(0, token_hint_length),
        token_suffix: token.slice(-token_hint_length),
        token_hash: tokenHash,
        expires_at: expiresAt,
      });

      return {
        token,
        expiresAt: expiresAt.toISOString(),
      };
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
