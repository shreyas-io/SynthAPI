import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "./App";

afterEach(() => {
  vi.restoreAllMocks();
  window.history.pushState({}, "", "/");
});

describe("App", () => {
  it("renders the signin page", () => {
    window.history.pushState({}, "", "/signin");

    render(<App />);

    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });

  it("renders protected projects after session check", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "success",
            data: { id: "user-1", username: "demo" },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "success",
            data: {
              total: 1,
              records: [
                {
                  id: "project-1",
                  slug: "demo-project",
                  name: "Demo Project",
                  description: "A test project",
                },
              ],
            },
          }),
        ),
      );

    window.history.pushState({}, "", "/projects");
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Demo Project" })).toBeInTheDocument();
    });
  });
});
