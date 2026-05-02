import type { AuthenticatedUser } from "../../entities/authenticated_user";
import type { AuthorizedSession } from "../../entities/authorized_session";

type AuthorizedSessionCandidate = {
  token_hash: string;
  user: AuthenticatedUser;
};

export interface IAuthorizedSessionsRepository {
  create: (
    input: Omit<AuthorizedSession, "id" | "created_at" | "updated_at">,
  ) => Promise<AuthorizedSession>;
  findActiveCandidates: (
    input: Pick<AuthorizedSession, "token_prefix" | "token_suffix"> & {
      now: Date;
    },
  ) => Promise<AuthorizedSessionCandidate[]>;
}
