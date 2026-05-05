import { AppContext } from "../../..";
import {
  HttpStatusCode,
  MockApiException,
} from "../../../exceptions/exception";
import { MockApiResponsesRepository } from "../../../infrastructure/kysely/repositories/mock_api_responses";
import { MockApiResponseEt } from "../../entities/mock_api_response/mock_api_response";

type MockApiResponseInput = Pick<
  MockApiResponseEt,
  "mock_api_id" | "name" | "response" | "rule_tree" | "post_response_actions"
>;

type MockApiResponseFilters = {
  ids?: string[];
  mock_api_ids?: string[];
  name?: string;
};

type MockApiResponsePagination = {
  limit: number;
  offset: number;
};

type MockApiResponseSort = {
  by: "name" | "created_at";
  order: "asc" | "desc";
};

export const MockApiResponsesUsecase = (ctx: AppContext) => {
  const mock_api_responses_repository = MockApiResponsesRepository(
    ctx.database,
  );

  return {
    createMockApiResponse: async (
      input: MockApiResponseInput,
    ): Promise<MockApiResponseEt> => {
      const id = await mock_api_responses_repository.create(input);

      const mock_api_responses = await mock_api_responses_repository.list({
        filters: {
          ids: [id],
        },
      });
      const mock_api_response = mock_api_responses.at(0);

      if (!mock_api_response) {
        throw new MockApiException({
          public_message: "Error encountered while creating mock API response.",
        });
      }

      return mock_api_response;
    },
    getMockApiResponse: async (id: string): Promise<MockApiResponseEt> => {
      const mock_api_responses = await mock_api_responses_repository.list({
        filters: {
          ids: [id],
        },
      });
      const mock_api_response = mock_api_responses.at(0);

      if (!mock_api_response) {
        throw new MockApiException({
          public_message: "Mock API response not found.",
          status_code: HttpStatusCode.NOT_FOUND,
        });
      }

      return mock_api_response;
    },
    getMockApiResponses: async (
      filters: MockApiResponseFilters,
      pagination: MockApiResponsePagination,
      sort: MockApiResponseSort,
    ) => {
      const [total, records] = await Promise.all([
        mock_api_responses_repository.count({
          filters,
        }),
        mock_api_responses_repository.list({
          filters,
          pagination,
          sort,
          columns: ["id", "mock_api_id", "name", "created_at"],
        }),
      ]);
      return {
        total,
        records,
      };
    },
    updateMockApiResponse(
      id: string,
      input: MockApiResponseInput,
    ): Promise<void> {
      return mock_api_responses_repository.update(id, input);
    },
    deleteMockApiResponse(id: string): Promise<void> {
      return mock_api_responses_repository.delete(id);
    },
  };
};
