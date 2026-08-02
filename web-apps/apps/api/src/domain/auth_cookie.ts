import { setCookie, deleteCookie } from "hono/cookie";
import type { Context } from "hono";

import { createCookieOptions } from "../config/cookies";

export const AUTH_COOKIE_NAME = "synthapi_session";

export const getAuthCookie = (c: Context): string | null => {
  const cookieHeader = c.req.header("cookie");

  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const cookie = cookies.find((item) =>
    item.startsWith(`${AUTH_COOKIE_NAME}=`),
  );

  if (!cookie) return null;

  return decodeURIComponent(cookie.slice(AUTH_COOKIE_NAME.length + 1));
};

export const setAuthCookie = (
  c: Context,
  token: string,
  expiresAt: string,
  secure: boolean,
) => {
  setCookie(c, AUTH_COOKIE_NAME, token, {
    ...createCookieOptions(secure),
    expires: new Date(expiresAt),
  });
};

export const clearAuthCookie = (c: Context, secure: boolean) => {
  deleteCookie(c, AUTH_COOKIE_NAME, {
    ...createCookieOptions(secure),
  });
};
