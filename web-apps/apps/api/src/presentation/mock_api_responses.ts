import type { Hono } from "hono";

import { ApiGatewayException, HttpStatusCode } from "../domain/exceptions/exception";
import { MockApiResponsesUsecase } from "../domain/usecases/mock_api/responses";
import type { AuthenticatedUser } from "../domain/entities/authenticated_user";
import type { AppContext } from "../context";
import {
  createMockApiResponseDto,
  listMockApiResponsesFilterDto,
  listMockApiResponsesPaginationDto,
  listMockApiResponsesSortDto,
} from "./dtos/mock_api/mock_api_response";
import { getNumber, getString, getStringArray } from "./utils";

const getAuthenticatedUser = (user: AuthenticatedUser | undefined) => {
  if (!user) {
    throw new ApiGatewayException({
      public_message: "Unauthorized",
      status_code: HttpStatusCode.UNAUTHORIZED,
    });
  }

  return user;
};

export const addMockApiResponseRoutes = (
  app: Hono,
  ctx: AppContext,
) => {
  const mock_api_responses = MockApiResponsesUsecase(ctx);

  app.post("/api/v1/mock-apis/:id/responses", async (c) => {
    const body = (c.get("body") ?? {}) as Record<string, unknown>;
    const parsed = createMockApiResponseDto.safeParse({
      ...body,
      mock_api_id: c.req.param("id"),
    });
    if (!parsed.success) {
      throw new ApiGatewayException({
        public_message: JSON.stringify(parsed.error.issues),
      });
    }
    const input = parsed.data;
    const user = getAuthenticatedUser(c.var.user);
    const mock_api_response =
      await mock_api_responses.createMockApiResponse(user, {
        mock_api_id: input.mock_api_id,
        name: input.name,
        is_default: input.is_default,
        response: input.response,
        rule_tree: input.rule_tree ?? null,
        post_response_actions: input.post_response_actions ?? null,
      });

    return c.json(mock_api_response, 201);
  });

  app.patch("/api/v1/mock-apis/:id/responses/reorder", async (c) => {
    const user = getAuthenticatedUser(c.var.user);
    const mock_api_id = getString(c.req.param("id"));
    const body = (c.get("body") ?? {}) as Record<string, unknown>;
    const response_ids = getStringArray(body.response_ids);

    if (!mock_api_id || !response_ids) {
      throw new ApiGatewayException({
        public_message: "Invalid payload: mock_api_id and an array of response_ids are required",
        status_code: HttpStatusCode.BAD_REQUEST,
      });
    }

    await mock_api_responses.reorderMockApiResponses(user, mock_api_id, response_ids);
    return c.json({ success: true }, 200);
  });

  app.get("/api/v1/mock-apis/:id/responses", async (c) => {
    const query = c.req.query();
    const filters: {
      ids?: string[];
      mock_api_ids: string[];
      name?: string;
      fetch_deleted?: boolean;
    } = {
      mock_api_ids: [c.req.param("id")],
    };
    const ids = getStringArray(query.id);
    const name = getString(query.name);
    const fetch_deleted = query.fetch_deleted === "true";

    if (ids?.length) {
      filters.ids = ids;
    }

    if (name) {
      filters.name = name;
    }

    filters.fetch_deleted = fetch_deleted;

    const parsedFilters = listMockApiResponsesFilterDto.safeParse(filters);
    if (!parsedFilters.success) {
      throw new ApiGatewayException({
        public_message: JSON.stringify(parsedFilters.error.issues),
      });
    }

    const parsedPagination = listMockApiResponsesPaginationDto.safeParse({
      limit: getNumber(query.limit, 20),
      offset: getNumber(query.offset, 0),
    });
    if (!parsedPagination.success) {
      throw new ApiGatewayException({
        public_message: JSON.stringify(parsedPagination.error.issues),
      });
    }

    const parsedSort = listMockApiResponsesSortDto.safeParse({
      by: getString(query.sort_by) ?? "execution_order",
      order: getString(query.sort_order) ?? "asc",
    });
    if (!parsedSort.success) {
      throw new ApiGatewayException({
        public_message: JSON.stringify(parsedSort.error.issues),
      });
    }

    return c.json(
      await mock_api_responses.getMockApiResponses(
        parsedFilters.data,
        parsedPagination.data,
        parsedSort.data,
      ),
    );
  });

  app.get("/api/v1/mock-apis/:id/responses/:response_id", async (c) => {
    return c.json(
      await mock_api_responses.getMockApiResponse(
        c.req.param("response_id"),
      ),
    );
  });

  app.put("/api/v1/mock-apis/:id/responses/:response_id", async (c) => {
    const body = (c.get("body") ?? {}) as Record<string, unknown>;
    const parsed = createMockApiResponseDto.safeParse({
      ...body,
      mock_api_id: c.req.param("id"),
    });
    if (!parsed.success) {
      throw new ApiGatewayException({
        public_message: JSON.stringify(parsed.error.issues),
      });
    }
    const input = parsed.data;
    const user = getAuthenticatedUser(c.var.user);
    await mock_api_responses.updateMockApiResponse(
      user,
      c.req.param("response_id"),
      {
        mock_api_id: input.mock_api_id,
        name: input.name,
        is_default: input.is_default,
        response: input.response,
        rule_tree: input.rule_tree ?? null,
        post_response_actions: input.post_response_actions ?? null,
      },
    );
    return c.json({});
  });

  app.delete("/api/v1/mock-apis/:id/responses/:response_id", async (c) => {
    const user = getAuthenticatedUser(c.var.user);
    await mock_api_responses.deleteMockApiResponse(
      user,
      c.req.param("response_id"),
    );
    return c.body(null, 204);
  });

  app.post("/api/v1/mock-apis/:id/responses/:response_id/restore", async (c) => {
    const user = getAuthenticatedUser(c.var.user);
    await mock_api_responses.restoreMockApiResponse(
      user,
      c.req.param("response_id"),
    );
    return c.json({});
  });
};
