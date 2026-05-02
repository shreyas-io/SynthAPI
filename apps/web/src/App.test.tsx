import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "./App";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("App", () => {
  it("renders backend data after a successful bootstrap request", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "ok",
            timestamp: "2026-05-01T00:00:00.000Z",
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: "Hello from the application layer, Hono on Cloudflare Workers.",
            target: "Hono on Cloudflare Workers",
          }),
        ),
      );

    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Hello from the application layer, Hono on Cloudflare Workers.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("renders an error message when the bootstrap request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network down"));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Network down")).toBeInTheDocument();
    });
  });
});
