import type { Express, Request } from "express";
import * as z from "zod";

import type { ApiGatewayDatabase } from "../infrastructure/kysely/index.js";
import { asyncRoute } from "../middleware/async_route.js";
import {
  createAuthService,
  DuplicateUsernameError,
} from "../services/auth.js";

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

export const addAuthRoutes = (
  app: Express,
  apiGatewayDatabase: ApiGatewayDatabase,
) => {
  const auth = createAuthService(apiGatewayDatabase.db);

  app.post(
    "/api/v1/auth/signup",
    asyncRoute(async (req, res) => {
      const body = signupBodySchema.safeParse(req.body);

      if (!body.success) {
        res.status(400).json({
          status: "error",
          error: {
            message: "Invalid signup request",
          },
        });
        return;
      }

      try {
        res.status(201).json(await auth.signup(body.data));
      } catch (error) {
        if (error instanceof DuplicateUsernameError) {
          res.status(409).json({
            status: "error",
            error: {
              message: "Username already exists",
            },
          });
          return;
        }

        throw error;
      }
    }),
  );

  app.post(
    "/api/v1/auth/signin",
    asyncRoute(async (req, res) => {
      const credentials = parseBasicAuth(req);

      if (!credentials) {
        res.status(401).json({
          status: "error",
          error: {
            message: "Basic auth credentials are required",
          },
        });
        return;
      }

      const signin = await auth.signin(credentials);

      if (!signin) {
        res.status(401).json({
          status: "error",
          error: {
            message: "Invalid credentials",
          },
        });
        return;
      }

      res.json(signin);
    }),
  );
};
