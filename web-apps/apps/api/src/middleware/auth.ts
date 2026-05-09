import type { NextFunction, Request, Response } from "express";
import { AuthService } from "../domain/auth";
import {
  ApiGatewayException,
  HttpStatusCode,
} from "../domain/exceptions/exception";
import type { ServerContext } from "../server";
import { getAuthCookie } from "../domain/auth_cookie";

const parseBearerToken = (req: Request): string | null => {
  const cookieToken = getAuthCookie(req);

  if (cookieToken) {
    return cookieToken;
  }

  const header = req.header("authorization");

  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  const token = header.slice("Bearer ".length).trim();

  return token.length > 0 ? token : null;
};

export const authMiddleware = (serverContext: ServerContext) => {
  const auth = AuthService(serverContext);

  return async (req: Request, res: Response, next: NextFunction) => {
    const token = parseBearerToken(req);

    if (!token) {
      throw new ApiGatewayException({
        public_message: "Unauthorized",
        status_code: HttpStatusCode.UNAUTHORIZED,
      });
    }

    const user = await auth.validateToken(token);

    if (!user) {
      throw new ApiGatewayException({
        public_message: "Unauthorized",
        status_code: HttpStatusCode.UNAUTHORIZED,
      });
    }

    req.user = user;
    next();
  };
};
