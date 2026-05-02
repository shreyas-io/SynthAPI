import { describe, expect, it } from "vitest";

import { createApiApp } from "../src/app";

describe("API worker", () => {
  it("returns a health payload", async () => {
    const app = createApiApp();
    const response = await app.request("http://localhost/health");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "ok",
    });
  });

  it("returns a greeting payload", async () => {
    const app = createApiApp();
    const response = await app.request("http://localhost/greeting");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message: "Hello from the application layer, Hono on Cloudflare Workers.",
      target: "Hono on Cloudflare Workers",
    });
  });

  it("adds CORS headers for the configured frontend origin", async () => {
    const app = createApiApp();
    const response = await app.request("http://localhost/health", {
      headers: {
        Origin: "http://127.0.0.1:5173",
      },
    });

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://127.0.0.1:5173",
    );
  });
});
