import { setTimeout as delay } from "node:timers/promises";
import type { Express, NextFunction, Request, Response } from "express";

import type { RequestBodyEt } from "../domain/entities/execution_context";
import type { SseStreamItemEt } from "../domain/entities/mock_api_response/sse";
import { executePublicMockApi } from "../domain/usecases/mock_api/execution";
import type { AppContext } from "../server";

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

const getRequestBody = (req: Request): RequestBodyEt => {
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

const writeSseItem = async (
  res: Response,
  item: SseStreamItemEt,
) => {
  await delay(item.delay_ms ?? 5);

  if (item.sse.id) {
    res.write(`id: ${item.sse.id}\n`);
  }

  if (item.sse.event) {
    res.write(`event: ${item.sse.event}\n`);
  }

  if (item.sse.retry_ms !== undefined) {
    res.write(`retry: ${item.sse.retry_ms}\n`);
  }

  if (typeof item.sse.data === "string") {
    for (const line of item.sse.data.split(/\r?\n/)) {
      res.write(`data: ${line}\n`);
    }
  } else {
    res.write(`data: ${JSON.stringify(item.sse.data)}\n`);
  }

  res.write("\n");
};

const sendMockApiResponse = async (
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

  if (result.body.type === "sse") {
    const iterator = result.body.stream[Symbol.asyncIterator]();
    let next = await iterator.next();

    if (next.done) {
      res.end();
      return;
    }

    res.flushHeaders?.();

    while (!next.done) {
      await writeSseItem(res, next.value);
      next = await iterator.next();
    }

    res.end();
    return;
  }

  res.json(result.body.value);
};

export const addProjectSlugRouter = (app: Express, ctx: AppContext) => {
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

    void executePublicMockApi(ctx, {
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
