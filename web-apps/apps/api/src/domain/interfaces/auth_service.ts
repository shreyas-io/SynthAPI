import type { AuthenticatedUser } from "../entities/authenticated_user";

type SignupInput = {
  username: string;
  password: string;
};

type SigninInput = SignupInput;

export interface IAuthService {
  signup: (input: SignupInput) => Promise<AuthenticatedUser>;
  signin: (
    input: SigninInput,
  ) => Promise<{ token: string; expiresAt: string } | null>;
  validateToken: (token: string) => Promise<AuthenticatedUser | null>;
}
