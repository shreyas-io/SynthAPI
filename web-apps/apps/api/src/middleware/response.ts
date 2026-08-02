import { createMiddleware } from "hono/factory";

export const responseMiddleware = createMiddleware(async (c, next) => {
  const originalJson = c.json.bind(c);

  (c as any).json = (
    data: unknown,
    status?: number,
    headers?: Record<string, string>,
  ) => {
    const statusCode = status ?? c.res.status ?? 200;

    if (statusCode >= 400) {
      return (originalJson as any)(data, statusCode, headers);
    }

    return (originalJson as any)({ status: "success", data }, statusCode, headers);
  };

  await next();
});
