import { createMiddleware } from "hono/factory";

const getContentType = (c: {
  req: { header: (name: string) => string | undefined };
}): string => {
  return (c.req.header("content-type") ?? "").toLowerCase();
};

export const bodyParserMiddleware = createMiddleware(async (c, next) => {
  const contentType = getContentType(c);

  // Let the multipart middleware handle multipart bodies so it can stream them.
  if (contentType.includes("multipart/form-data")) {
    await next();
    return;
  }

  const arrayBuffer = await c.req.raw.arrayBuffer();
  const raw = new TextDecoder().decode(arrayBuffer);
  c.set("rawBody", raw);

  let body: unknown;

  if (contentType.includes("application/json")) {
    try {
      body = raw ? JSON.parse(raw) : undefined;
    } catch {
      body = raw;
    }
  } else if (contentType.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(raw);
    const record: Record<string, string | string[]> = {};
    for (const [key, value] of params) {
      const existing = record[key];
      if (existing === undefined) {
        record[key] = value;
      } else if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        record[key] = [existing, value];
      }
    }
    body = record;
  } else if (contentType.includes("text/plain")) {
    body = raw;
  } else if (contentType.includes("application/octet-stream")) {
    body = arrayBuffer;
  } else {
    // Default to the raw string so handlers can inspect it if needed.
    body = raw;
  }

  c.set("body", body);
  await next();
});
