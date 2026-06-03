import type { User } from "../../../entities/user";

export interface IUsersRepository {
  create: (input: {
    email: string | null;
    display_name: string | null;
    avatar_url: string | null;
  }) => Promise<User>;
  findById: (id: string) => Promise<User | null>;
}
