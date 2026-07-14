import type { Express } from "express";

import {
  ApiGatewayException,
  HttpStatusCode,
} from "../domain/exceptions/exception";
import { getOrganizationAiCreditBalance, getActiveOrganizationPlan } from "../domain/usecases/organizations/plans";
import { OrganizationsUsecase } from "../domain/usecases/organizations";
import { asyncRoute } from "../middleware/async_route";
import type { AppContext } from "../server";
import {
  createOrganizationDto,
  addOrganizationMemberDto,
  updateOrganizationMemberDto,
  getInvitesQueryDto,
} from "./dtos/organizations";
import { z } from "zod";

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

  app.get(
    "/api/v1/organizations/:organization_id/plan",
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

      const plan = await getActiveOrganizationPlan(ctx.db, organization_id);
      res.json(plan);
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

  app.get(
    "/api/v1/organizations/:organization_id/members",
    asyncRoute(async (req, res) => {
      const members = await organizations.getMembers(
        getAuthenticatedUser(req.user),
        req.params.organization_id as string,
      );

      res.json(members);
    }),
  );

  app.get(
    "/api/v1/organizations/:organization_id/invites",
    asyncRoute(async (req, res) => {
      const { success, error, data } = getInvitesQueryDto.safeParse(req.query);

      if (!success) {
        throw new ApiGatewayException({
          public_message: JSON.stringify(z.treeifyError(error)),
          status_code: HttpStatusCode.BAD_REQUEST,
        });
      }

      const invites = await organizations.getInvites(
        getAuthenticatedUser(req.user),
        req.params.organization_id as string,
        data.status,
      );

      res.json(invites);
    }),
  );

  app.post(
    "/api/v1/organizations/:organization_id/members",
    asyncRoute(async (req, res) => {
      const organization_id = req.params.organization_id as string;
      const parsed = addOrganizationMemberDto.safeParse(req.body);

      if (!parsed.success) {
        throw new ApiGatewayException({
          public_message: JSON.stringify(parsed.error.issues),
        });
      }

      await organizations.addMember(
        getAuthenticatedUser(req.user),
        organization_id,
        parsed.data.email,
        parsed.data.role,
      );

      res.status(201).json({});
    }),
  );

  app.post(
    "/api/v1/invites/:invite_id/accept",
    asyncRoute(async (req, res) => {
      const invite_id = req.params.invite_id as string;

      await organizations.acceptInvite(
        getAuthenticatedUser(req.user),
        invite_id,
      );

      res.json({});
    }),
  );

  app.delete(
    "/api/v1/organizations/:organization_id/invites/:invite_id",
    asyncRoute(async (req, res) => {
      const organization_id = req.params.organization_id as string;
      const invite_id = req.params.invite_id as string;

      await organizations.revokeInvite(
        getAuthenticatedUser(req.user),
        organization_id,
        invite_id,
      );

      res.status(204).send();
    }),
  );

  app.patch(
    "/api/v1/organizations/:organization_id/members/:user_id",
    asyncRoute(async (req, res) => {
      const organization_id = req.params.organization_id as string;
      const user_id = req.params.user_id as string;
      const payload = updateOrganizationMemberDto.parse(req.body);

      await organizations.updateMember(
        getAuthenticatedUser(req.user),
        organization_id,
        user_id,
        payload.status,
      );

      res.status(204).send();
    }),
  );

  app.delete(
    "/api/v1/organizations/:organization_id/members/:user_id",
    asyncRoute(async (req, res) => {
      const organization_id = req.params.organization_id as string;
      const user_id = req.params.user_id as string;

      await organizations.removeMember(
        getAuthenticatedUser(req.user),
        organization_id,
        user_id,
      );

      res.status(204).send();
    }),
  );

  app.delete(
    "/api/v1/organizations/:organization_id/membership",
    asyncRoute(async (req, res) => {
      const organization_id = req.params.organization_id as string;

      await organizations.leaveOrganization(
        getAuthenticatedUser(req.user),
        organization_id,
      );

      res.status(204).send();
    }),
  );
};
