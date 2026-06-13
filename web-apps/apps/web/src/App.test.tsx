import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "./App";

afterEach(() => {
  vi.restoreAllMocks();
  window.history.pushState({}, "", "/platform/");
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
    window.history.pushState({}, "", "/platform/signin");

    render(<App />);

    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(
      await screen.findByRole("link", { name: "Continue with Google" }),
    ).toHaveAttribute(
      "href",
      "http://localhost:8787/api/v1/auth/google/start?return_to=%2Fprojects",
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

    window.history.pushState({}, "", "/platform/signin?error=google");
    render(<App />);

    expect(
      await screen.findByText("Google sign in failed. Please try again."),
    ).toBeInTheDocument();
  });

  it("renders protected projects after session check", async () => {
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

      if (url.endsWith("/api/v1/profile")) {
        return success({
              user: {
                id: "user-1",
                email: "demo@example.com",
                display_name: "Demo User",
                avatar_url: null,
                default_organization_id: "org-1",
              },
              organizations: [
                {
                  id: "org-1",
                  name: "Default org",
                  created_by_user_id: "user-1",
                  deleted_at: null,
                  created_at: "2026-01-01T00:00:00.000Z",
                  updated_at: "2026-01-01T00:00:00.000Z",
                  membership: {
                    role: "owner",
                    status: "active",
                    stale_reason: null,
                    staled_at: null,
                  },
                  plan: null,
                  ai_credits: { granted: 0, used: 0, remaining: 0 },
                },
              ],
        });
      }

      if (url.endsWith("/api/v1/organizations/org-1/credits")) {
        return success({ granted: 0, used: 0, remaining: 0 });
      }

      if (url.includes("/api/v1/projects?")) {
        return success({
          total: 1,
          records: [
            {
              id: "project-1",
              slug: "demo-project",
              name: "Demo Project",
              description: "A test project",
            },
          ],
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    window.history.pushState({}, "", "/platform/projects");
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

      if (url.endsWith("/api/v1/profile")) {
        return success({
          user: {
            id: "user-1",
            email: "demo@example.com",
            display_name: "Demo User",
            avatar_url: null,
            default_organization_id: "org-1",
          },
          organizations: [
            {
              id: "org-1",
              name: "Default org",
              created_by_user_id: "user-1",
              deleted_at: null,
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-01T00:00:00.000Z",
              membership: {
                role: "owner",
                status: "active",
                stale_reason: null,
                staled_at: null,
              },
              plan: null,
              ai_credits: { granted: 0, used: 0, remaining: 0 },
            },
          ],
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
          curl_command: "curl -X GET http://demo-project.mock.localhost:8787/orders",
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

    window.history.pushState({}, "", "/platform/projects/project-1/mock-apis/api-1");
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

  it("wires response editor save and delete actions", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
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

      if (url.endsWith("/api/v1/profile")) {
        return success({
          user: {
            id: "user-1",
            email: "demo@example.com",
            display_name: "Demo User",
            avatar_url: null,
            default_organization_id: "org-1",
          },
          organizations: [
            {
              id: "org-1",
              name: "Default org",
              created_by_user_id: "user-1",
              deleted_at: null,
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-01T00:00:00.000Z",
              membership: {
                role: "owner",
                status: "active",
                stale_reason: null,
                staled_at: null,
              },
              plan: null,
              ai_credits: { granted: 0, used: 0, remaining: 0 },
            },
          ],
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
              method: "POST",
              path: "/posts",
              name: "Create blog post",
              description: "Create posts",
              variables: [],
            },
          ],
        });
      }

      if (url.endsWith("/api/v1/mock-apis/api-1")) {
        return success({
          id: "api-1",
          project_id: "project-1",
          method: "POST",
          path: "/posts",
          name: "Create blog post",
          description: "Create posts",
          variables: [],
          curl_command:
            "curl -X POST -H \"Content-Type: application/json\" -d '{}' http://demo-project.mock.localhost:8787/posts",
        });
      }

      if (url.endsWith("/api/v1/mock-apis/api-1/responses?limit=50&offset=0")) {
        return success({
          total: 1,
          records: [
            {
              id: "response-1",
              mock_api_id: "api-1",
              name: "Unauthorized create",
              is_default: false,
              deleted_at: null,
            },
          ],
        });
      }

      if (url.endsWith("/api/v1/mock-apis/api-1/responses?limit=50&offset=0&fetch_deleted=true")) {
        return success({ total: 0, records: [] });
      }

      if (url.endsWith("/api/v1/mock-apis/api-1/responses/response-1")) {
        if (init?.method === "PUT") {
          return new Response(null, { status: 204 });
        }
        if (init?.method === "DELETE") {
          return new Response(null, { status: 204 });
        }

        return success({
          id: "response-1",
          mock_api_id: "api-1",
          name: "Unauthorized create",
          is_default: false,
          deleted_at: null,
          response: {
            status_code: 401,
            headers: { "content-type": "application/json" },
            cookies: {},
            body: {
              type: "json",
              value: { error: "Authorization header required" },
            },
          },
          rule_tree: null,
          post_response_actions: [],
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);

    window.history.pushState(
      {},
      "",
      "/platform/projects/project-1/mock-apis/api-1/responses/response-1",
    );
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /Save response/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/mock-apis/api-1/responses/response-1"),
        expect.objectContaining({ method: "PUT" }),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/mock-apis/api-1/responses/response-1"),
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });
});
