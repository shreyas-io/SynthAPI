import type { Request, Response } from "express";

export const AUTH_COOKIE_NAME = "mock_stack_session";

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
) => {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
    expires: new Date(expiresAt),
  });
};

export const clearAuthCookie = (res: Response) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
  });
};
