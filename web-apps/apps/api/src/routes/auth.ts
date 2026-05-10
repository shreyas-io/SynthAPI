import type { Express, Request } from "express";
import * as z from "zod";

import { AuthService } from "../domain/auth";
import {
  ApiGatewayException,
  HttpStatusCode,
} from "../domain/exceptions/exception";
import { clearAuthCookie, setAuthCookie } from "../domain/auth_cookie";
import { asyncRoute } from "../middleware/async_route";
import { authMiddleware } from "../middleware/auth";
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
  const requireAuth = authMiddleware(serverContext);

  app.post(
    "/api/v1/auth/signup",
    asyncRoute(async (req, res) => {
      const body = signupBodySchema.safeParse(req.body);

      if (!body.success) {
        throw new ApiGatewayException({
          public_message: "Invalid signup request",
          status_code: HttpStatusCode.BAD_REQUEST,
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
          status_code: HttpStatusCode.UNAUTHORIZED,
        });
      }

      const signin = await auth.signin(credentials);

      if (!signin) {
        throw new ApiGatewayException({
          public_message: "Unauthorized",
          status_code: HttpStatusCode.UNAUTHORIZED,
        });
      }

      setAuthCookie(res, signin.token, signin.expiresAt);

      res.json(signin);
    }),
  );

  app.post(
    "/api/v1/auth/signout",
    asyncRoute(async (_req, res) => {
      clearAuthCookie(res);
      res.json({});
    }),
  );

  app.get(
    "/api/v1/auth/me",
    requireAuth,
    asyncRoute(async (req, res) => {
      res.json(req.user);
    }),
  );
};
