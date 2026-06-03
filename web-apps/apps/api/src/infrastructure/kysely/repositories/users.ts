import type { Selectable } from "kysely";
import type { IUsersRepository } from "../../../domain/interfaces/repositories/users/users.js";
import type { ServerContext } from "../../../server.js";
import type { UsersTable } from "../models/index.js";
import type { User } from "../../../domain/entities/user.js";

type UserRow = Selectable<UsersTable>;

const toUser = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  display_name: row.display_name,
  avatar_url: row.avatar_url,
  default_organization_id: row.default_organization_id,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

type UserFilters = {
  ids?: string[] | undefined;
  email?: string | undefined;
};

type ColumnKeys = Extract<keyof User, string>;

const list = (ctx: ServerContext): IUsersRepository["list"] => {
  async function listUsers(params: {
    filters: UserFilters;
  }): Promise<User[]>;
  async function listUsers<C extends readonly ColumnKeys[]>(params: {
    filters: UserFilters;
    columns: C;
  }): Promise<Pick<User, C[number]>[]>;
  async function listUsers<C extends readonly ColumnKeys[]>({
    filters,
    columns,
  }: {
    filters: UserFilters;
    columns?: C;
  }): Promise<User[] | Pick<User, C[number]>[]> {
    if (!filters.ids?.length && !filters.email) {
      return [];
    }

    let query = ctx.db.selectFrom("users");

    if (columns?.length) {
      query = query.select(columns);
    } else {
      query = query.selectAll();
    }

    if (filters.ids?.length) {
      query = query.where("id", "in", filters.ids);
    }

    if (filters.email) {
      query = query.where("email", "=", filters.email);
    }

    const rows = await query.execute();

    return rows as User[] | Pick<User, C[number]>[];
  }

  return listUsers;
};

export const UsersRepository = (ctx: ServerContext): IUsersRepository => ({
  async create(input) {
    const row = await ctx.db
      .insertInto("users")
      .values({
        email: input.email,
        display_name: input.display_name,
        avatar_url: input.avatar_url,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return toUser(row);
  },
  list: list(ctx),
});
