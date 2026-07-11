import express, { type Express } from "express";
import { asyncRoute } from "../middleware/async_route";
import type { AppContext } from "../server";
import { TemplatesUsecase } from "../domain/usecases/mock_api/templates";
import { ApiGatewayException, HttpStatusCode } from "../domain/exceptions/exception";
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

const createFromTemplateDto = z.object({
  template_id: z.string().min(1),
  organization_id: z.string().uuid(),
});

export const addTemplateRoutes = (app: Express, ctx: AppContext) => {
  const templates = TemplatesUsecase(ctx);

  app.get(
    "/api/v1/templates",
    asyncRoute(async (req, res) => {
      res.json(templates.getTemplatesList());
    })
  );

  app.post(
    "/api/v1/projects/from-template",
    asyncRoute(async (req, res) => {
      const parsedBody = createFromTemplateDto.safeParse(req.body);
      if (!parsedBody.success) {
        throw new ApiGatewayException({
          public_message: JSON.stringify(parsedBody.error.issues),
          status_code: HttpStatusCode.BAD_REQUEST,
        });
      }

      const project = await templates.createProjectFromTemplate(
        getAuthenticatedUser(req.user),
        parsedBody.data.template_id,
        parsedBody.data.organization_id
      );

      res.status(201).json(project);
    })
  );
};
