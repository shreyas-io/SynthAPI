import type { User } from "../../entities/user";

export interface IUsersRepository {
  create: (input: { username: string; password_hash: string }) => Promise<User>;
  findByUsername: (username: string) => Promise<User | null>;
}
