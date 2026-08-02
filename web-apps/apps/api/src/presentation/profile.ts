import type { Hono } from "hono";

import {
  ApiGatewayException,
  HttpStatusCode,
} from "../domain/exceptions/exception";
import { OrganizationsUsecase } from "../domain/usecases/organizations";
import type { AuthenticatedUser } from "../domain/entities/authenticated_user";
import type { AppContext } from "../context";

const getAuthenticatedUser = (user: AuthenticatedUser | undefined) => {
  if (!user) {
    throw new ApiGatewayException({
      public_message: "Unauthorized",
      status_code: HttpStatusCode.UNAUTHORIZED,
    });
  }

  return user;
};

export const addProfileRoutes = (app: Hono, ctx: AppContext) => {
  const organizations = OrganizationsUsecase(ctx);

  app.get("/api/v1/profile", async (c) => {
    return c.json(
      await organizations.getUserProfile(getAuthenticatedUser(c.var.user)),
    );
  });
};
