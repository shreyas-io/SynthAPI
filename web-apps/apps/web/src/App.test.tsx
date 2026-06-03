import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "./App";

afterEach(() => {
  vi.restoreAllMocks();
  window.history.pushState({}, "", "/");
});

describe("App", () => {
  it("renders the signin page", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: "success",
          data: { google: { enabled: true } },
        }),
      ),
    );
    window.history.pushState({}, "", "/signin");

    render(<App />);

    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(
      await screen.findByRole("link", { name: "Continue with Google" }),
    ).toHaveAttribute(
      "href",
      "http://localhost:8787/mock-stack/api/v1/auth/google/start?return_to=%2Fprojects",
    );
  });

  it("shows a google signin error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: "success",
          data: { google: { enabled: true } },
        }),
      ),
    );

    window.history.pushState({}, "", "/signin?error=google");
    render(<App />);

    expect(
      await screen.findByText("Google sign in failed. Please try again."),
    ).toBeInTheDocument();
  });

  it("renders protected projects after session check", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "success",
            data: {
              id: "user-1",
              email: "demo@example.com",
              display_name: "Demo User",
              avatar_url: null,
            },
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

  it("renders the mock API workspace without duplicate API titles", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      const success = (data: unknown) =>
        new Response(JSON.stringify({ status: "success", data }));

      if (url.endsWith("/api/v1/auth/me")) {
        return success({
          id: "user-1",
          email: "demo@example.com",
          display_name: "Demo User",
          avatar_url: null,
        });
      }

      if (url.endsWith("/api/v1/projects/project-1")) {
        return success({
          id: "project-1",
          slug: "demo-project",
          name: "Demo Project",
          description: "A test project",
          globals: [],
          constants: [],
        });
      }

      if (url.includes("/api/v1/mock-apis?")) {
        return success({
          total: 1,
          records: [
            {
              id: "api-1",
              project_id: "project-1",
              method: "GET",
              path: "/orders",
              name: "Orders API",
              description: "Order routes",
              variables: [],
            },
          ],
        });
      }

      if (url.endsWith("/api/v1/mock-apis/api-1")) {
        return success({
          id: "api-1",
          project_id: "project-1",
          method: "GET",
          path: "/orders",
          name: "Orders API",
          description: "Order routes",
          variables: [],
        });
      }

      if (url.endsWith("/api/v1/mock-apis/api-1/responses?limit=50&offset=0")) {
        return success({
          total: 1,
          records: [
            {
              id: "response-1",
              mock_api_id: "api-1",
              name: "Happy path",
              is_default: true,
            },
          ],
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    window.history.pushState({}, "", "/projects/project-1/mock-apis/api-1");
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Orders API/ })).toBeInTheDocument();
    });
    expect(screen.getByText("Responses")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Happy path (default)" })).toBeInTheDocument();
    expect(screen.queryByText("Total responses")).not.toBeInTheDocument();
    expect(screen.queryByText("Default response")).not.toBeInTheDocument();
    expect(screen.getByText("Select or create a response.")).toBeInTheDocument();
  });
});
