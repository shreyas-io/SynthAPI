import type { Express, Request } from "express";
import * as z from "zod";

import { AuthService } from "../domain/auth";
import {
  ApiGatewayException,
  ApiGatewayStatusCode,
} from "../domain/exceptions/exception";
import { asyncRoute } from "../middleware/async_route";
import type { ServerContext } from "../server";

const signupBodySchema = z.object({
  username: z.string().regex(/^[a-z0-9_]+$/),
  password: z.string().min(1),
});

const parseBasicAuth = (req: Request) => {
  const header = req.header("authorization");

  if (!header?.startsWith("Basic ")) {
    return null;
  }

  const decoded = Buffer.from(header.slice("Basic ".length), "base64").toString(
    "utf8",
  );
  const separatorIndex = decoded.indexOf(":");

  if (separatorIndex === -1) {
    return null;
  }

  return {
    username: decoded.slice(0, separatorIndex),
    password: decoded.slice(separatorIndex + 1),
  };
};

export const addAuthRoutes = (app: Express, serverContext: ServerContext) => {
  const auth = AuthService(serverContext);

  app.post(
    "/api/v1/auth/signup",
    asyncRoute(async (req, res) => {
      const body = signupBodySchema.safeParse(req.body);

      if (!body.success) {
        throw new ApiGatewayException({
          public_message: "Invalid signup request",
          status_code: ApiGatewayStatusCode.BAD_REQUEST,
        });
      }

      res.status(201).json(await auth.signup(body.data));
    }),
  );

  app.post(
    "/api/v1/auth/signin",
    asyncRoute(async (req, res) => {
      const credentials = parseBasicAuth(req);

      if (!credentials) {
        throw new ApiGatewayException({
          public_message: "Unauthorized",
          status_code: ApiGatewayStatusCode.UNAUTHORIZED,
        });
      }

      const signin = await auth.signin(credentials);

      if (!signin) {
        throw new ApiGatewayException({
          public_message: "Unauthorized",
          status_code: ApiGatewayStatusCode.UNAUTHORIZED,
        });
      }

      res.json(signin);
    }),
  );
};
