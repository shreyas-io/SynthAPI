import type { Express, NextFunction, Request, Response } from "express";

import type { MockApisSdk } from "./mock_apis";

type MockApiExecutionResponse = {
  status_code: number;
  headers: Record<string, any>;
  cookies: Record<string, any>;
  body:
    | { type: "json"; value: any }
    | { type: "text"; value: string }
    | { type: "empty" };
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

const getRequestBody = (req: Request) => {
  const content_type = req.headers["content-type"]?.toLowerCase() ?? "";

  if (req.body === undefined || req.body === null) {
    return { type: "empty" };
  }

  if (content_type.includes("application/x-www-form-urlencoded")) {
    return { type: "form_urlencoded", value: req.body };
  }

  if (content_type.includes("text/plain")) {
    return { type: "text", value: String(req.body) };
  }

  if (content_type.includes("application/json")) {
    return { type: "json", value: req.body };
  }

  return { type: "empty" };
};

const getForwardedHeaders = (req: Request): Record<string, any> => {
  const { "x-project-slug": _project_slug, ...headers } = req.headers;

  return headers;
};

const sendMockApiResponse = (
  res: Response,
  result: MockApiExecutionResponse,
) => {
  for (const [key, value] of Object.entries(result.headers)) {
    res.setHeader(key, String(value));
  }

  for (const [key, value] of Object.entries(result.cookies)) {
    res.cookie(key, String(value));
  }

  res.status(result.status_code);

  if (result.body.type === "empty") {
    res.send();
    return;
  }

  if (result.body.type === "text") {
    res.type("text/plain").send(result.body.value);
    return;
  }

  res.json(result.body);
};

export const addPublicMockApiRoutes = (
  app: Express,
  mock_apis: MockApisSdk,
) => {
  app.all(/.*/, (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api/v1")) {
      next();
      return;
    }

    const project_slug = req.get("x-project-slug");

    if (!project_slug) {
      next();
      return;
    }

    void mock_apis
      .executePublicMockApi({
        project_slug,
        method: req.method,
        url: req.originalUrl,
        headers: getForwardedHeaders(req),
        body: getRequestBody(req),
        cookies: parseCookies(req.headers.cookie),
      })
      .then((result) =>
        sendMockApiResponse(res, result as MockApiExecutionResponse),
      )
      .catch(next);
  });
};
