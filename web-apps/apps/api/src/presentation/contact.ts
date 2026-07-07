import type { Express } from "express";

import {
  ApiGatewayException,
  HttpStatusCode,
} from "../domain/exceptions/exception";
import { ContactUsecase } from "../domain/usecases/contact";
import { asyncRoute } from "../middleware/async_route";
import type { AppContext } from "../server";
import { createContactMessageDto } from "./dtos/contact";

export const addContactRoutes = (app: Express, ctx: AppContext) => {
  const contact = ContactUsecase(ctx);

  app.post(
    "/api/v1/contact",
    asyncRoute(async (req, res) => {
      const parsed = createContactMessageDto.safeParse(req.body);
      if (!parsed.success) {
        throw new ApiGatewayException({
          public_message: JSON.stringify(parsed.error.issues),
          status_code: HttpStatusCode.BAD_REQUEST,
        });
      }

      const message = await contact.createContactMessage(parsed.data);

      res.status(201).json(message);
    }),
  );
};