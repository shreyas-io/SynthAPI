import type { Express } from "express";

import {
  ApiGatewayException,
  HttpStatusCode,
} from "../domain/exceptions/exception";
import { getOrganizationAiCreditBalance } from "../domain/usecases/organizations/plans";
import { OrganizationsUsecase } from "../domain/usecases/organizations";
import { asyncRoute } from "../middleware/async_route";
import type { AppContext } from "../server";
import { createOrganizationDto } from "./dtos/organizations";

const getAuthenticatedUser = (user: Express.Request["user"]) => {
  if (!user) {
    throw new ApiGatewayException({
      public_message: "Unauthorized",
      status_code: HttpStatusCode.UNAUTHORIZED,
    });
  }

  return user;
};

export const addOrganizationRoutes = (app: Express, ctx: AppContext) => {
  const organizations = OrganizationsUsecase(ctx);

  app.get(
    "/api/v1/organizations/:organization_id/credits",
    asyncRoute(async (req, res) => {
      const organization_id = req.params.organization_id as string;
      const user = getAuthenticatedUser(req.user);

      const membership = await ctx.db
        .selectFrom("organization_memberships")
        .innerJoin(
          "organizations",
          "organizations.id",
          "organization_memberships.organization_id",
        )
        .select(["organization_memberships.id"])
        .where("organization_memberships.organization_id", "=", organization_id)
        .where("organizations.deleted_at", "is", null)
        .where("organization_memberships.user_id", "=", user.id)
        .where("organization_memberships.status", "=", "active")
        .executeTakeFirst();

      if (!membership) {
        throw new ApiGatewayException({
          public_message: "Organization not found.",
          status_code: HttpStatusCode.NOT_FOUND,
        });
      }

      res.json(await getOrganizationAiCreditBalance(ctx.db, organization_id));
    }),
  );

  app.post(
    "/api/v1/organizations",
    asyncRoute(async (req, res) => {
      const parsed = createOrganizationDto.safeParse(req.body);
      if (!parsed.success) {
        throw new ApiGatewayException({
          public_message: JSON.stringify(parsed.error.issues),
        });
      }

      const organization = await organizations.createOrganization(
        getAuthenticatedUser(req.user),
        parsed.data,
      );

      res.status(201).json(organization);
    }),
  );

  app.delete(
    "/api/v1/organizations/:organization_id",
    asyncRoute(async (req, res) => {
      await organizations.deleteOrganization(
        getAuthenticatedUser(req.user),
        req.params.organization_id as string,
      );

      res.status(204).send();
    }),
  );

  app.post(
    "/api/v1/organizations/:organization_id/restore",
    asyncRoute(async (req, res) => {
      await organizations.restoreOrganization(
        getAuthenticatedUser(req.user),
        req.params.organization_id as string,
      );

      res.json({});
    }),
  );
};
