import type { Selectable } from "kysely";
import type { IUsersRepository } from "../../../domain/interfaces/repositories/users.js";
import type { ServerContext } from "../../../server.js";
import type { UsersTable } from "../models/index.js";
import type { User } from "../../../domain/entities/user.js";

type UserRow = Selectable<UsersTable>;

const toUser = (row: UserRow): User => ({
  id: row.id,
  username: row.username,
  password_hash: row.password_hash,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

export const UsersRepository = (ctx: ServerContext): IUsersRepository => ({
  async create(input) {
    const row = await ctx.db
      .insertInto("users")
      .values({
        username: input.username,
        password_hash: input.password_hash,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return toUser(row);
  },
  async findByUsername(username) {
    const row = await ctx.db
      .selectFrom("users")
      .selectAll()
      .where("username", "=", username)
      .executeTakeFirst();

    return row ? toUser(row) : null;
  },
});
