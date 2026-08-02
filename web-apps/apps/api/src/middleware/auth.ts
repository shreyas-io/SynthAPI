import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import { AuthService } from "../domain/auth";
import { getAuthCookie } from "../domain/auth_cookie";
import type { AppContext } from "../context";

const parseBearerToken = (authorization: string | undefined): string | null => {
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();

  return token.length > 0 ? token : null;
};

export const bearerAuthMiddleware = (ctx: AppContext) => {
  const auth = AuthService(ctx);

  return createMiddleware(async (c, next) => {
    const cookieToken = getAuthCookie(c);
    const header = c.req.header("authorization");
    const token = cookieToken ?? parseBearerToken(header);

    if (!token) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const user = await auth.validateToken(token);

    if (!user) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    c.set("user", user);
    await next();
  });
};
