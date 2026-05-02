import { randomBytes } from "node:crypto";

import argon2 from "argon2";
import type { Kysely } from "kysely";

import type { Database } from "../infrastructure/kysely/index.js";

const tokenLengthBytes = 64;
const tokenHintLength = 4;
const sessionTtlMs = 7 * 24 * 60 * 60 * 1000;
const argon2Options = {
  type: argon2.argon2id,
};

export type AuthService = {
  signup: (input: {
    username: string;
    password: string;
  }) => Promise<{ id: string; username: string }>;
  signin: (input: {
    username: string;
    password: string;
  }) => Promise<{ token: string; expiresAt: string } | null>;
};

const normalizeUsername = (username: string): string => username.trim();

const createToken = () => randomBytes(tokenLengthBytes).toString("hex");

const isUniqueConstraintError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "23505";

export class DuplicateUsernameError extends Error {
  constructor() {
    super("Username already exists");
  }
}

export const createAuthService = (db: Kysely<Database>): AuthService => ({
  async signup(input) {
    const username = normalizeUsername(input.username);
    const passwordHash = await argon2.hash(input.password, argon2Options);

    try {
      const user = await db
        .insertInto("users")
        .values({
          username,
          password_hash: passwordHash,
        })
        .returning(["id", "username"])
        .executeTakeFirstOrThrow();

      return user;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new DuplicateUsernameError();
      }

      throw error;
    }
  },
  async signin(input) {
    const username = normalizeUsername(input.username);
    const user = await db
      .selectFrom("users")
      .select(["id", "password_hash"])
      .where("username", "=", username)
      .executeTakeFirst();

    if (!user) {
      return null;
    }

    const passwordMatches = await argon2.verify(user.password_hash, input.password);

    if (!passwordMatches) {
      return null;
    }

    const token = createToken();
    const tokenHash = await argon2.hash(token, argon2Options);
    const expiresAt = new Date(Date.now() + sessionTtlMs);

    await db
      .insertInto("authorized_sessions")
      .values({
        user_id: user.id,
        token_prefix: token.slice(0, tokenHintLength),
        token_suffix: token.slice(-tokenHintLength),
        token_hash: tokenHash,
        expires_at: expiresAt,
      })
      .execute();

    return {
      token,
      expiresAt: expiresAt.toISOString(),
    };
  },
});
