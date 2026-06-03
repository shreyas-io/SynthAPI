import type { User } from "../../../entities/user";

type UserFilters = {
  ids?: string[] | undefined;
  email?: string | undefined;
};

type UserUpdateInput = Partial<
  Pick<User, "email" | "display_name" | "avatar_url" | "default_organization_id">
>;
type ColumnKeys = Extract<keyof User, string>;

export interface IUsersRepository {
  create: (input: {
    email: string | null;
    display_name: string | null;
    avatar_url: string | null;
  }) => Promise<User>;
  update: (id: string, input: UserUpdateInput) => Promise<void>;
  list: {
    (params: { filters: UserFilters }): Promise<User[]>;
    <C extends readonly ColumnKeys[]>(params: {
      filters: UserFilters;
      columns: C;
    }): Promise<Pick<User, C[number]>[]>;
  };
}
