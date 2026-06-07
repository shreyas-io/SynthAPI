import type { Express } from "express";

import {
  ApiGatewayException,
  HttpStatusCode,
} from "../domain/exceptions/exception";
import { OrganizationsUsecase } from "../domain/usecases/organizations";
import { asyncRoute } from "../middleware/async_route";
import type { AppContext } from "../server";

const getAuthenticatedUser = (user: Express.Request["user"]) => {
  if (!user) {
    throw new ApiGatewayException({
      public_message: "Unauthorized",
      status_code: HttpStatusCode.UNAUTHORIZED,
    });
  }

  return user;
};

export const addProfileRoutes = (app: Express, ctx: AppContext) => {
  const organizations = OrganizationsUsecase(ctx);

  app.get(
    "/api/v1/profile",
    asyncRoute(async (req, res) => {
      res.json(
        await organizations.getUserProfile(getAuthenticatedUser(req.user)),
      );
    }),
  );
};
