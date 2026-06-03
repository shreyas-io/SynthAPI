import { randomBytes, timingSafeEqual } from "node:crypto";
import type { Express, Request, Response } from "express";

import { AuthService } from "../domain/auth";
import {
  ApiGatewayException,
  HttpStatusCode,
} from "../domain/exceptions/exception";
import { clearAuthCookie, setAuthCookie } from "../domain/auth_cookie";
import { GoogleAuthProvider } from "../domain/auth_providers/google";
import { asyncRoute } from "../middleware/async_route";
import { bearerAuthMiddleware } from "../middleware/auth";
import type { AppContext } from "../server";
import { getString } from "./utils";

const OAUTH_STATE_COOKIE_NAME = "mock_stack_oauth_state";
const OAUTH_RETURN_COOKIE_NAME = "mock_stack_oauth_return_to";
const OAUTH_COOKIE_MAX_AGE_MS = 10 * 60 * 1000;

const parseCookie = (req: Request, name: string): string | null => {
  const cookieHeader = req.header("cookie");

  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const cookie = cookies.find((item) => item.startsWith(`${name}=`));

  if (!cookie) return null;

  return decodeURIComponent(cookie.slice(name.length + 1));
};

const setTemporaryCookie = (res: Response, name: string, value: string) => {
  res.cookie(name, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: OAUTH_COOKIE_MAX_AGE_MS,
  });
};

const clearTemporaryCookie = (res: Response, name: string) => {
  res.clearCookie(name, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
  });
};

const safeEquals = (a: string, b: string): boolean => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  return left.length === right.length && timingSafeEqual(left, right);
};

const normalizeReturnTo = (value: unknown): string => {
  const returnTo = getString(value) ?? "/projects";

  if (!returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return "/projects";
  }

  return returnTo;
};

const getWebBaseUrl = (secrets: AppContext["env"]): string => {
  return secrets.WEB_APP_BASE_URL.replace(/\/$/, "");
};

const redirectToSigninError = (res: Response, secrets: AppContext["env"]) => {
  res.redirect(`${getWebBaseUrl(secrets)}/signin?error=google`);
};

const getGoogleProvider = (secrets: AppContext["env"]) => {
  if (
    !secrets.GOOGLE_OAUTH_CLIENT_ID ||
    !secrets.GOOGLE_OAUTH_CLIENT_SECRET ||
    !secrets.GOOGLE_OAUTH_REDIRECT_URI
  ) {
    return null;
  }

  return GoogleAuthProvider({
    client_id: secrets.GOOGLE_OAUTH_CLIENT_ID,
    client_secret: secrets.GOOGLE_OAUTH_CLIENT_SECRET,
    redirect_uri: secrets.GOOGLE_OAUTH_REDIRECT_URI,
  });
};

export const addAuthRoutes = (app: Express, ctx: AppContext) => {
  const auth = AuthService(ctx);
  const requireAuth = bearerAuthMiddleware(ctx);

  app.get(
    "/api/v1/auth/providers",
    asyncRoute(async (_req, res) => {
      res.json({
        google: {
          enabled: Boolean(getGoogleProvider(ctx.env)),
        },
      });
    }),
  );

  app.get(
    "/api/v1/auth/google/start",
    asyncRoute(async (req, res) => {
      const google = getGoogleProvider(ctx.env);

      if (!google) {
        throw new ApiGatewayException({
          public_message: "Google sign in is not configured",
          status_code: HttpStatusCode.PRECONDITION_FAILED,
        });
      }

      const state = randomBytes(32).toString("hex");
      const returnTo = normalizeReturnTo(req.query.return_to);

      setTemporaryCookie(res, OAUTH_STATE_COOKIE_NAME, state);
      setTemporaryCookie(res, OAUTH_RETURN_COOKIE_NAME, returnTo);

      res.redirect(google.getAuthorizationUrl(state));
    }),
  );

  app.get(
    "/api/v1/auth/google/callback",
    asyncRoute(async (req, res) => {
      const google = getGoogleProvider(ctx.env);
      const code = getString(req.query.code);
      const state = getString(req.query.state);
      const cookieState = parseCookie(req, OAUTH_STATE_COOKIE_NAME);
      const returnTo = normalizeReturnTo(
        parseCookie(req, OAUTH_RETURN_COOKIE_NAME),
      );

      clearTemporaryCookie(res, OAUTH_STATE_COOKIE_NAME);
      clearTemporaryCookie(res, OAUTH_RETURN_COOKIE_NAME);

      if (!google || !code || !state || !cookieState) {
        redirectToSigninError(res, ctx.env);
        return;
      }

      if (!safeEquals(state, cookieState)) {
        redirectToSigninError(res, ctx.env);
        return;
      }

      try {
        const identity = await google.exchangeCallback(code);
        const signin = await auth.signinWithProviderIdentity(identity);
        setAuthCookie(res, signin.token, signin.expiresAt);
        res.redirect(`${getWebBaseUrl(ctx.env)}${returnTo}`);
      } catch {
        redirectToSigninError(res, ctx.env);
      }
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
