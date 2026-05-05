import type { Selectable } from "kysely";
import type { AuthorizedSessionsTable } from "../models/index.js";
import type { AuthorizedSession } from "../../../domain/entities/authorized_session.js";
import type { IAuthorizedSessionsRepository } from "../../../domain/interfaces/repositories/auth_sessionts.js";
import type { ServerContext } from "../../../server.js";

type AuthorizedSessionRow = Selectable<AuthorizedSessionsTable>;

const toAuthorizedSession = (row: AuthorizedSessionRow): AuthorizedSession => ({
  id: row.id,
  user_id: row.user_id,
  token_prefix: row.token_prefix,
  token_suffix: row.token_suffix,
  token_hash: row.token_hash,
  expires_at: row.expires_at,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

export const AuthorizedSessionsRepository = (
  serverContext: ServerContext,
): IAuthorizedSessionsRepository => ({
  async create(
    input: Omit<AuthorizedSession, "id" | "created_at" | "updated_at">,
  ): Promise<AuthorizedSession> {
    const row = await serverContext.db
      .insertInto("authorized_sessions")
      .values({
        user_id: input.user_id,
        token_prefix: input.token_prefix,
        token_suffix: input.token_suffix,
        token_hash: input.token_hash,
        expires_at: input.expires_at,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return toAuthorizedSession(row);
  },
  async findActiveCandidates(
    input: Pick<AuthorizedSession, "token_prefix" | "token_suffix"> & {
      now: Date;
    },
  ) {
    const rows = await serverContext.db
      .selectFrom("authorized_sessions")
      .innerJoin("users", "users.id", "authorized_sessions.user_id")
      .select([
        "users.id as user_id",
        "users.username as username",
        "authorized_sessions.token_hash as token_hash",
      ])
      .where("authorized_sessions.token_prefix", "=", input.token_prefix)
      .where("authorized_sessions.token_suffix", "=", input.token_suffix)
      .where("authorized_sessions.expires_at", ">", input.now)
      .execute();

    return rows.map((row) => ({
      token_hash: row.token_hash,
      user: {
        id: row.user_id,
        username: row.username,
      },
    }));
  },
});
