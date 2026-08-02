import type { Hono } from "hono";
import { z } from "zod";

import type { AppContext } from "../context";
import { TemplatesUsecase } from "../domain/usecases/mock_api/templates";
import { ApiGatewayException, HttpStatusCode } from "../domain/exceptions/exception";
import type { AuthenticatedUser } from "../domain/entities/authenticated_user";

const getAuthenticatedUser = (user: AuthenticatedUser | undefined) => {
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

export const addTemplateRoutes = (app: Hono, ctx: AppContext) => {
  const templates = TemplatesUsecase(ctx);

  app.get("/api/v1/templates", async (c) => {
    return c.json(templates.getTemplatesList());
  });

  app.post("/api/v1/projects/from-template", async (c) => {
    const parsedBody = createFromTemplateDto.safeParse(c.get("body"));
    if (!parsedBody.success) {
      throw new ApiGatewayException({
        public_message: JSON.stringify(parsedBody.error.issues),
        status_code: HttpStatusCode.BAD_REQUEST,
      });
    }

    const project = await templates.createProjectFromTemplate(
      getAuthenticatedUser(c.var.user),
      parsedBody.data.template_id,
      parsedBody.data.organization_id
    );

    return c.json(project, 201);
  });
};
