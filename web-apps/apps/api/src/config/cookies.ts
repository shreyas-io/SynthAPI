export const createCookieOptions = (secure: boolean) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure,
  path: "/",
});
