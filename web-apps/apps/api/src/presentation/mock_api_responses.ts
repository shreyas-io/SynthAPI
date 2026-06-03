import type { Express } from "express";

import { ApiGatewayException } from "../domain/exceptions/exception";
import { MockApiResponsesUsecase } from "../domain/usecases/mock_api/responses";
import { asyncRoute } from "../middleware/async_route";
import type { AppContext } from "../server";
import {
  createMockApiResponseDto,
  listMockApiResponsesFilterDto,
  listMockApiResponsesPaginationDto,
  listMockApiResponsesSortDto,
} from "./dtos/mock_api/mock_api_response";

const getString = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  return undefined;
};

const getStringArray = (value: unknown): string[] | undefined => {
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  return undefined;
};

const getNumber = (value: unknown, fallback: number): number => {
  const stringValue = getString(value);
  const numberValue = stringValue ? Number(stringValue) : fallback;

  return Number.isFinite(numberValue) ? numberValue : fallback;
};

export const addMockApiResponseRoutes = (
  app: Express,
  ctx: AppContext,
) => {
  const mock_api_responses = MockApiResponsesUsecase(ctx);

  app.post(
    "/api/v1/mock-apis/:id/responses",
    asyncRoute(async (req, res) => {
      const parsed = createMockApiResponseDto.safeParse({
        ...req.body,
        mock_api_id: req.params.id,
      });
      if (!parsed.success) {
        throw new ApiGatewayException({
          public_message: JSON.stringify(parsed.error.issues),
        });
      }
      const input = parsed.data;
      const mock_api_response =
        await mock_api_responses.createMockApiResponse({
          mock_api_id: input.mock_api_id,
          name: input.name,
          is_default: input.is_default,
          response: input.response,
          rule_tree: input.rule_tree ?? null,
          post_response_actions: input.post_response_actions ?? null,
        });

      res.status(201).json(mock_api_response);
    }),
  );

  app.get(
    "/api/v1/mock-apis/:id/responses",
    asyncRoute(async (req, res) => {
      const filters: {
        ids?: string[];
        mock_api_ids: string[];
        name?: string;
      } = {
        mock_api_ids: [req.params.id as string],
      };
      const ids = getStringArray(req.query.id);
      const name = getString(req.query.name);

      if (ids?.length) {
        filters.ids = ids;
      }

      if (name) {
        filters.name = name;
      }

      const parsedFilters = listMockApiResponsesFilterDto.safeParse(filters);
      if (!parsedFilters.success) {
        throw new ApiGatewayException({
          public_message: JSON.stringify(parsedFilters.error.issues),
        });
      }

      const parsedPagination = listMockApiResponsesPaginationDto.safeParse({
        limit: getNumber(req.query.limit, 20),
        offset: getNumber(req.query.offset, 0),
      });
      if (!parsedPagination.success) {
        throw new ApiGatewayException({
          public_message: JSON.stringify(parsedPagination.error.issues),
        });
      }

      const parsedSort = listMockApiResponsesSortDto.safeParse({
        by: getString(req.query.sort_by) ?? "created_at",
        order: getString(req.query.sort_order) ?? "desc",
      });
      if (!parsedSort.success) {
        throw new ApiGatewayException({
          public_message: JSON.stringify(parsedSort.error.issues),
        });
      }

      res.json(
        await mock_api_responses.getMockApiResponses(
          parsedFilters.data,
          parsedPagination.data,
          parsedSort.data,
        ),
      );
    }),
  );

  app.get(
    "/api/v1/mock-apis/:id/responses/:response_id",
    asyncRoute(async (req, res) => {
      res.json(
        await mock_api_responses.getMockApiResponse(
          req.params.response_id as string,
        ),
      );
    }),
  );

  app.put(
    "/api/v1/mock-apis/:id/responses/:response_id",
    asyncRoute(async (req, res) => {
      const parsed = createMockApiResponseDto.safeParse({
        ...req.body,
        mock_api_id: req.params.id,
      });
      if (!parsed.success) {
        throw new ApiGatewayException({
          public_message: JSON.stringify(parsed.error.issues),
        });
      }
      const input = parsed.data;
      await mock_api_responses.updateMockApiResponse(
        req.params.response_id as string,
        {
          mock_api_id: input.mock_api_id,
          name: input.name,
          is_default: input.is_default,
          response: input.response,
          rule_tree: input.rule_tree ?? null,
          post_response_actions: input.post_response_actions ?? null,
        },
      );
      res.json({});
    }),
  );

  app.delete(
    "/api/v1/mock-apis/:id/responses/:response_id",
    asyncRoute(async (req, res) => {
      await mock_api_responses.deleteMockApiResponse(
        req.params.response_id as string,
      );
      res.status(204).send();
    }),
  );
};
