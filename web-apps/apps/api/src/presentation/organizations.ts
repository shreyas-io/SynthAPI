import type { Hono } from "hono";
import { z } from "zod";

import {
  ApiGatewayException,
  HttpStatusCode,
} from "../domain/exceptions/exception";
import { getOrganizationAiCreditBalance, getActiveOrganizationPlan } from "../domain/usecases/organizations/plans";
import { OrganizationsUsecase } from "../domain/usecases/organizations";
import type { AuthenticatedUser } from "../domain/entities/authenticated_user";
import type { AppContext } from "../context";
import {
  createOrganizationDto,
  addOrganizationMemberDto,
  updateOrganizationMemberDto,
  getInvitesQueryDto,
} from "./dtos/organizations";

const getAuthenticatedUser = (user: AuthenticatedUser | undefined) => {
  if (!user) {
    throw new ApiGatewayException({
      public_message: "Unauthorized",
      status_code: HttpStatusCode.UNAUTHORIZED,
    });
  }

  return user;
};

export const addOrganizationRoutes = (app: Hono, ctx: AppContext) => {
  const organizations = OrganizationsUsecase(ctx);

  app.get("/api/v1/organizations/:organization_id/credits", async (c) => {
    const organization_id = c.req.param("organization_id");
    const user = getAuthenticatedUser(c.var.user);

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

    return c.json(await getOrganizationAiCreditBalance(ctx.db, organization_id));
  });

  app.get("/api/v1/organizations/:organization_id/plan", async (c) => {
    const organization_id = c.req.param("organization_id");
    const user = getAuthenticatedUser(c.var.user);

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
    return c.json(plan);
  });

  app.post("/api/v1/organizations", async (c) => {
    const parsed = createOrganizationDto.safeParse(c.get("body"));
    if (!parsed.success) {
      throw new ApiGatewayException({
        public_message: JSON.stringify(parsed.error.issues),
      });
    }

    const organization = await organizations.createOrganization(
      getAuthenticatedUser(c.var.user),
      parsed.data,
    );

    return c.json(organization, 201);
  });

  app.delete("/api/v1/organizations/:organization_id", async (c) => {
    await organizations.deleteOrganization(
      getAuthenticatedUser(c.var.user),
      c.req.param("organization_id"),
    );

    return c.body(null, 204);
  });

  app.post("/api/v1/organizations/:organization_id/restore", async (c) => {
    await organizations.restoreOrganization(
      getAuthenticatedUser(c.var.user),
      c.req.param("organization_id"),
    );

    return c.json({});
  });

  app.get("/api/v1/organizations/:organization_id/members", async (c) => {
    const members = await organizations.getMembers(
      getAuthenticatedUser(c.var.user),
      c.req.param("organization_id"),
    );

    return c.json(members);
  });

  app.get("/api/v1/organizations/:organization_id/invites", async (c) => {
    const { success, error, data } = getInvitesQueryDto.safeParse(c.req.query());

    if (!success) {
      throw new ApiGatewayException({
        public_message: JSON.stringify(z.treeifyError(error)),
        status_code: HttpStatusCode.BAD_REQUEST,
      });
    }

    const invites = await organizations.getInvites(
      getAuthenticatedUser(c.var.user),
      c.req.param("organization_id"),
      data.status,
    );

    return c.json(invites);
  });

  app.post("/api/v1/organizations/:organization_id/members", async (c) => {
    const organization_id = c.req.param("organization_id");
    const parsed = addOrganizationMemberDto.safeParse(c.get("body"));

    if (!parsed.success) {
      throw new ApiGatewayException({
        public_message: JSON.stringify(parsed.error.issues),
      });
    }

    await organizations.addMember(
      getAuthenticatedUser(c.var.user),
      organization_id,
      parsed.data.email,
      parsed.data.role,
    );

    return c.json({}, 201);
  });

  app.post("/api/v1/invites/:invite_id/accept", async (c) => {
    const invite_id = c.req.param("invite_id");

    await organizations.acceptInvite(
      getAuthenticatedUser(c.var.user),
      invite_id,
    );

    return c.json({});
  });

  app.delete(
    "/api/v1/organizations/:organization_id/invites/:invite_id",
    async (c) => {
      const organization_id = c.req.param("organization_id");
      const invite_id = c.req.param("invite_id");

      await organizations.revokeInvite(
        getAuthenticatedUser(c.var.user),
        organization_id,
        invite_id,
      );

      return c.body(null, 204);
    },
  );

  app.patch(
    "/api/v1/organizations/:organization_id/members/:user_id",
    async (c) => {
      const organization_id = c.req.param("organization_id");
      const user_id = c.req.param("user_id");
      const payload = updateOrganizationMemberDto.parse(c.get("body"));

      await organizations.updateMember(
        getAuthenticatedUser(c.var.user),
        organization_id,
        user_id,
        payload.status,
      );

      return c.body(null, 204);
    },
  );

  app.delete(
    "/api/v1/organizations/:organization_id/members/:user_id",
    async (c) => {
      const organization_id = c.req.param("organization_id");
      const user_id = c.req.param("user_id");

      await organizations.removeMember(
        getAuthenticatedUser(c.var.user),
        organization_id,
        user_id,
      );

      return c.body(null, 204);
    },
  );

  app.delete(
    "/api/v1/organizations/:organization_id/membership",
    async (c) => {
      const organization_id = c.req.param("organization_id");

      await organizations.leaveOrganization(
        getAuthenticatedUser(c.var.user),
        organization_id,
      );

      return c.body(null, 204);
    },
  );
};
