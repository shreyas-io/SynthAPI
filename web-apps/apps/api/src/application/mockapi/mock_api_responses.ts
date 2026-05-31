import { MockApiException } from "../../domain/exceptions/exception";
import { MockApiResponsesUsecase } from "../../domain/usecases/mock_api/responses";
import type { MockApiContext } from "./context";
import {
  createMockApiResponseDto,
  listMockApiResponsesFilterDto,
  listMockApiResponsesPaginationDto,
  listMockApiResponsesSortDto,
} from "./validation/mock_api_response";

type MockApiResponseFilters = {
  ids?: string[];
  mock_api_ids?: string[];
  name?: string;
};

export function MockApiResponsesApplication(ctx: MockApiContext) {
  const mock_api_responses = MockApiResponsesUsecase(ctx);

  return {
    createMockApiResponse: (data: unknown) => {
      const {
        data: input,
        success,
        error,
      } = createMockApiResponseDto.safeParse(data);

      if (!success) {
        throw new MockApiException({
          public_message: JSON.stringify(error.issues),
        });
      }

      return mock_api_responses.createMockApiResponse({
        mock_api_id: input.mock_api_id,
        name: input.name,
        is_default: input.is_default,
        response: input.response,
        rule_tree: input.rule_tree ?? null,
        post_response_actions: input.post_response_actions ?? null,
      });
    },
    getMockApiResponse: (id: string) =>
      mock_api_responses.getMockApiResponse(id),
    listMockApisResponse: (
      filters: unknown,
      pagination: unknown,
      sort: unknown,
    ) => {
      const {
        data: parsed_filters,
        success: filters_success,
        error: filters_error,
      } = listMockApiResponsesFilterDto.safeParse(filters);
      if (!filters_success) {
        throw new MockApiException({
          public_message: JSON.stringify(filters_error.issues),
        });
      }

      const {
        data: parsed_pagination,
        success: pagination_success,
        error: pagination_error,
      } = listMockApiResponsesPaginationDto.safeParse(pagination);
      if (!pagination_success) {
        throw new MockApiException({
          public_message: JSON.stringify(pagination_error.issues),
        });
      }

      const {
        data: parsed_sort,
        success: sort_success,
        error: sort_error,
      } = listMockApiResponsesSortDto.safeParse(sort);
      if (!sort_success) {
        throw new MockApiException({
          public_message: JSON.stringify(sort_error.issues),
        });
      }

      const mock_api_response_filters: MockApiResponseFilters = {};

      if (parsed_filters.ids?.length) {
        mock_api_response_filters.ids = parsed_filters.ids;
      }
      if (parsed_filters.mock_api_ids?.length) {
        mock_api_response_filters.mock_api_ids = parsed_filters.mock_api_ids;
      }
      if (parsed_filters.name) {
        mock_api_response_filters.name = parsed_filters.name;
      }

      return mock_api_responses.getMockApiResponses(
        mock_api_response_filters,
        parsed_pagination,
        parsed_sort,
      );
    },
    updateMockApi: (id: string, data: unknown) => {
      const {
        data: input,
        success,
        error,
      } = createMockApiResponseDto.safeParse(data);

      if (!success) {
        throw new MockApiException({
          public_message: JSON.stringify(error.issues),
        });
      }

      return mock_api_responses.updateMockApiResponse(id, {
        mock_api_id: input.mock_api_id,
        name: input.name,
        is_default: input.is_default,
        response: input.response,
        rule_tree: input.rule_tree ?? null,
        post_response_actions: input.post_response_actions ?? null,
      });
    },
    deleteMockApi: (id: string) => mock_api_responses.deleteMockApiResponse(id),
  };
}
