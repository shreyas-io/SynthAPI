import type { Request, Response } from "express";

import { createCookieOptions } from "../config/cookies";

export const AUTH_COOKIE_NAME = "synthapi_session";

export const getAuthCookie = (req: Request): string | null => {
  const cookieHeader = req.header("cookie");

  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const cookie = cookies.find((item) =>
    item.startsWith(`${AUTH_COOKIE_NAME}=`),
  );

  if (!cookie) return null;

  return decodeURIComponent(cookie.slice(AUTH_COOKIE_NAME.length + 1));
};

export const setAuthCookie = (
  res: Response,
  token: string,
  expiresAt: string,
  secure: boolean,
) => {
  res.cookie(AUTH_COOKIE_NAME, token, {
    ...createCookieOptions(secure),
    expires: new Date(expiresAt),
  });
};

export const clearAuthCookie = (res: Response, secure: boolean) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    ...createCookieOptions(secure),
  });
};
