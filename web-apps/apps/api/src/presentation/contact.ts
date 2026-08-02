import type { Hono } from "hono";

import {
  ApiGatewayException,
  HttpStatusCode,
} from "../domain/exceptions/exception";
import { ContactUsecase } from "../domain/usecases/contact";
import type { AppContext } from "../context";
import { createContactMessageDto } from "./dtos/contact";

export const addContactRoutes = (app: Hono, ctx: AppContext) => {
  const contact = ContactUsecase(ctx);

  app.post("/api/v1/contact", async (c) => {
    const parsed = createContactMessageDto.safeParse(c.get("body"));
    if (!parsed.success) {
      throw new ApiGatewayException({
        public_message: JSON.stringify(parsed.error.issues),
        status_code: HttpStatusCode.BAD_REQUEST,
      });
    }

    const message = await contact.createContactMessage(parsed.data);

    return c.json(message, 201);
  });
};
