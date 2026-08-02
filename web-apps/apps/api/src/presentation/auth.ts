import { randomBytes, timingSafeEqual } from "node:crypto";
import type { Hono, Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";

import { createCookieOptions } from "../config/cookies";
import { AuthService } from "../domain/auth";
import {
  ApiGatewayException,
  HttpStatusCode,
} from "../domain/exceptions/exception";
import { clearAuthCookie, setAuthCookie } from "../domain/auth_cookie";
import { GoogleAuthProvider } from "../domain/auth_providers/google";
import { bearerAuthMiddleware } from "../middleware/auth";
import type { AppContext } from "../context";
import { getString } from "./utils";

const OAUTH_STATE_COOKIE_NAME = "synthapi_oauth_state";
const OAUTH_RETURN_COOKIE_NAME = "synthapi_oauth_return_to";
const OAUTH_COOKIE_MAX_AGE_MS = 10 * 60 * 1000;

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

const redirectToSigninError = (c: Context, secrets: AppContext["env"]) => {
  return c.redirect(`${getWebBaseUrl(secrets)}/signin?error=google`);
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

export const addAuthRoutes = (app: Hono, ctx: AppContext) => {
  const auth = AuthService(ctx);
  const requireAuth = bearerAuthMiddleware(ctx);
  const cookieOptions = createCookieOptions(ctx.env.COOKIE_SECURE);

  const setTemporaryCookie = (c: Context, name: string, value: string) => {
    setCookie(c, name, value, {
      ...cookieOptions,
      maxAge: OAUTH_COOKIE_MAX_AGE_MS,
    });
  };

  const clearTemporaryCookie = (c: Context, name: string) => {
    deleteCookie(c, name, cookieOptions);
  };

  app.get("/api/v1/auth/providers", async (c) => {
    return c.json({
      google: {
        enabled: Boolean(getGoogleProvider(ctx.env)),
      },
    });
  });

  app.get("/api/v1/auth/google/start", async (c) => {
    const google = getGoogleProvider(ctx.env);

    if (!google) {
      throw new ApiGatewayException({
        public_message: "Google sign in is not configured",
        status_code: HttpStatusCode.PRECONDITION_FAILED,
      });
    }

    const state = randomBytes(32).toString("hex");
    const returnTo = normalizeReturnTo(c.req.query("return_to"));

    setTemporaryCookie(c, OAUTH_STATE_COOKIE_NAME, state);
    setTemporaryCookie(c, OAUTH_RETURN_COOKIE_NAME, returnTo);

    return c.redirect(google.getAuthorizationUrl(state));
  });

  app.get("/api/v1/auth/google/callback", async (c) => {
    const google = getGoogleProvider(ctx.env);
    const code = getString(c.req.query("code"));
    const state = getString(c.req.query("state"));
    const cookieState = getCookie(c, OAUTH_STATE_COOKIE_NAME);
    const returnTo = normalizeReturnTo(getCookie(c, OAUTH_RETURN_COOKIE_NAME));

    clearTemporaryCookie(c, OAUTH_STATE_COOKIE_NAME);
    clearTemporaryCookie(c, OAUTH_RETURN_COOKIE_NAME);

    if (!google || !code || !state || !cookieState) {
      return redirectToSigninError(c, ctx.env);
    }

    if (!safeEquals(state, cookieState)) {
      return redirectToSigninError(c, ctx.env);
    }

    try {
      const identity = await google.exchangeCallback(code);
      const signin = await auth.signinWithProviderIdentity(identity);
      setAuthCookie(c, signin.token, signin.expiresAt, ctx.env.COOKIE_SECURE);
      return c.redirect(`${getWebBaseUrl(ctx.env)}${returnTo}`);
    } catch {
      return redirectToSigninError(c, ctx.env);
    }
  });

  app.post("/api/v1/auth/signout", async (c) => {
    clearAuthCookie(c, ctx.env.COOKIE_SECURE);
    return c.json({});
  });

  app.get("/api/v1/auth/me", requireAuth, async (c) => {
    return c.json(c.var.user);
  });
};
