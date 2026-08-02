import type { Hono, Context } from "hono";

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
import { setCookie } from "hono/cookie";
import { streamSSE } from "hono/streaming";

import type { RequestBodyEt } from "../domain/entities/execution_context";
import type { SseStreamItemEt } from "../domain/entities/mock_api_response/sse";
import { executePublicMockApi } from "../domain/usecases/mock_api/execution";
import type { AppContext } from "../context";

type MockApiExecutionResponse = {
  status_code: number;
  headers: Record<string, any>;
  cookies: Record<string, any>;
  body:
    | { type: "json"; value: any }
    | { type: "text"; value: string }
    | { type: "empty" }
    | { type: "sse"; stream: AsyncIterable<SseStreamItemEt> };
};

const parseCookies = (header: string | undefined): Record<string, string> => {
  if (!header) {
    return {};
  }

  return Object.fromEntries(
    header
      .split(";")
      .map((cookie) => cookie.trim().split("="))
      .filter(([key]) => Boolean(key))
      .map(([key, value = ""]) => [
        decodeURIComponent(key as string),
        decodeURIComponent(value),
      ]),
  );
};

const getRequestBody = (c: Context): RequestBodyEt => {
  const content_type = c.req.header("content-type")?.toLowerCase() ?? "";
  const body = c.get("body");

  if (
    content_type.includes("multipart/form-data") &&
    body &&
    typeof body === "object" &&
    "type" in body &&
    body.type === "multipart"
  ) {
    return body as RequestBodyEt;
  }

  if (content_type.includes("application/octet-stream")) {
    if (body instanceof ArrayBuffer) {
      const buffer = Buffer.from(body);
      return {
        type: "binary",
        value: {
          mime_type: content_type,
          size_bytes: buffer.length,
          content_base64: buffer.toString("base64"),
        },
      };
    }
    return { type: "empty" };
  }

  if (body === undefined || body === null) {
    return { type: "empty" };
  }

  if (content_type.includes("application/x-www-form-urlencoded")) {
    return { type: "form_urlencoded", value: body as Record<string, string | string[]> };
  }

  if (content_type.includes("text/plain")) {
    return { type: "text", value: String(body) };
  }

  if (content_type.includes("application/json")) {
    return { type: "json", value: body };
  }

  return { type: "empty" };
};

const getForwardedHeaders = (c: Context): Record<string, any> => {
  const headers: Record<string, any> = {};
  c.req.raw.headers.forEach((value, key) => {
    if (key !== "x-project-slug" && key !== "x-synthapi-project-key") {
      headers[key] = value;
    }
  });

  return headers;
};



const sendMockApiResponse = async (
  c: Context,
  result: MockApiExecutionResponse,
) => {
  for (const [key, value] of Object.entries(result.headers)) {
    c.header(key, String(value));
  }

  for (const [key, value] of Object.entries(result.cookies)) {
    setCookie(c, key, String(value));
  }

  c.status(result.status_code as any);

  if (result.body.type === "empty") {
    return c.body(null, result.status_code as any);
  }

  if (result.body.type === "text") {
    c.header("Content-Type", "text/plain");
    return c.body(result.body.value, result.status_code as any);
  }

  if (result.body.type === "sse") {
    const sseBody = result.body;
    c.header("Content-Encoding", "Identity");
    return streamSSE(c, async (stream) => {
      for await (const item of sseBody.stream) {
        await delay(item.delay_ms ?? 5);
        await stream.writeSSE({
          data:
            typeof item.sse.data === "string"
              ? item.sse.data
              : JSON.stringify(item.sse.data),
          event: item.sse.event,
          id: item.sse.id,
          retry: item.sse.retry_ms,
        });
      }
    });
  }

  return c.json(result.body.value, result.status_code as any);
};

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const extractProjectSlugFromHost = (
  host: string,
  template: string,
): string | null => {
  try {
    const templateHostname = new URL(template).hostname;
    const pattern = escapeRegExp(templateHostname).replace(
      /\\\{projectSlug\\\}/g,
      "(.+)",
    );
    const match = host.match(new RegExp(`^${pattern}$`));
    return match?.[1] ?? null;
  } catch {
    return null;
  }
};

const getProjectSlug = (c: Context, template: string): string | null => {
  const headerSlug = c.req.header("x-project-slug");
  if (headerSlug) {
    return headerSlug;
  }

  const host = new URL(c.req.url).hostname;
  return extractProjectSlugFromHost(host, template);
};

export const addProjectSlugRouter = (app: Hono, ctx: AppContext) => {
  app.all("*", async (c, next) => {
    if (c.req.path.startsWith("/api/v1")) {
      return next();
    }

    const project_slug = getProjectSlug(c, ctx.env.MOCK_API_BASE_URL_TEMPLATE);

    if (!project_slug) {
      return next();
    }

    const url = new URL(c.req.url);
    const originalUrl = `${url.pathname}${url.search}`;

    const result = await executePublicMockApi(ctx, {
      project_slug,
      method: c.req.method,
      url: originalUrl,
      headers: getForwardedHeaders(c),
      project_key: c.req.header("x-synthapi-project-key"),
      body: getRequestBody(c),
      cookies: parseCookies(c.req.header("cookie")),
    });

    return sendMockApiResponse(c, result as MockApiExecutionResponse);
  });
};
