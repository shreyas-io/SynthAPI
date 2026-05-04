import { AppContext } from "../..";
import { MockApiResponsesUsecase } from "../../domain/usecases/mock_api_responses";
import { MockApiException } from "../../exceptions/exception";
import {
  createMockApiResponseDto,
  listMockApiResponsesFilterDto,
  listMockApiResponsesPaginationDto,
  listMockApiResponsesSortDto,
} from "../dto/mock_api_response";

export function MockApiResponses(ctx: AppContext) {
  const mock_api_responses = MockApiResponsesUsecase(ctx);

  return {
    createMockApiResponse: (data: unknown) => {
      const {
        data: v,
        success,
        error,
      } = createMockApiResponseDto.safeParse(data);

      if (!success)
        throw new MockApiException({
          public_message: JSON.stringify(error.issues),
        });

      return mock_api_responses.createMockApiResponse({
        mock_api_id: v.mock_api_id,
        name: v.name,
        response: v.response,
        rate_limit_config: v.rate_limit_config ?? null,
        rule_tree: v.rule_tree ?? null,
        post_response_actions: v.post_response_actions ?? null,
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
        data: f,
        success: s_0,
        error: e_0,
      } = listMockApiResponsesFilterDto.safeParse(filters);
      if (!s_0)
        throw new MockApiException({
          public_message: JSON.stringify(e_0.issues),
        });

      const {
        data: p,
        success: s_1,
        error: e_1,
      } = listMockApiResponsesPaginationDto.safeParse(pagination);
      if (!s_1)
        throw new MockApiException({
          public_message: JSON.stringify(e_1.issues),
        });

      const {
        data: s,
        success: s_2,
        error: e_2,
      } = listMockApiResponsesSortDto.safeParse(sort);
      if (!s_2)
        throw new MockApiException({
          public_message: JSON.stringify(e_2.issues),
        });

      const mockApiResponseFilters: any = {};

      if (f.ids?.length) {
        mockApiResponseFilters.ids = f.ids;
      }

      if (f.mock_api_ids?.length) {
        mockApiResponseFilters.mock_api_ids = f.mock_api_ids;
      }

      if (f.name) {
        mockApiResponseFilters.name = f.name;
      }

      return mock_api_responses.getMockApiResponses(
        mockApiResponseFilters,
        p,
        s,
      );
    },
    deleteMockApi: (id: string) => mock_api_responses.deleteMockApiResponse(id),
    updateMockApi: (id: string, data: unknown) => {
      const {
        data: v,
        success,
        error,
      } = createMockApiResponseDto.safeParse(data);

      if (!success)
        throw new MockApiException({
          public_message: JSON.stringify(error.issues),
        });

      return mock_api_responses.updateMockApiResponse(id, {
        mock_api_id: v.mock_api_id,
        name: v.name,
        response: v.response,
        rate_limit_config: v.rate_limit_config ?? null,
        rule_tree: v.rule_tree ?? null,
        post_response_actions: v.post_response_actions ?? null,
      });
    },
  };
}
