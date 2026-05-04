import { AppContext } from "../../..";
import {
  HttpStatusCode,
  MockApiException,
} from "../../../exceptions/exception";
import { MockApisRepository } from "../../../infrastructure/kysely/repositories/mock_apis";
import type { MockApiEt } from "../../entities/mock_api";

type MockApiInput = Pick<
  MockApiEt,
  "project_id" | "method" | "path" | "name" | "description"
>;

type MockApiFilters = {
  ids?: string[];
  project_ids?: string[];
  method?: string;
  path?: string;
  name?: string;
  description?: string;
};

type MockApiPagination = {
  limit: number;
  offset: number;
};

type MockApiSort = {
  by: "name" | "created_at";
  order: "asc" | "desc";
};

export const MockApisUsecase = (ctx: AppContext) => {
  const mock_apis_repository = MockApisRepository(ctx.database);

  return {
    createMockApi: async (input: MockApiInput): Promise<MockApiEt> => {
      const id = await mock_apis_repository.create(input);

      const mock_apis = await mock_apis_repository.list({
        filters: {
          ids: [id],
        },
      });
      const mock_api = mock_apis.at(0);

      if (!mock_api) {
        throw new MockApiException({
          public_message: "Error encountered while creating mock API.",
        });
      }

      return mock_api;
    },
    getMockApi: async (id: string): Promise<MockApiEt> => {
      const mock_apis = await mock_apis_repository.list({
        filters: {
          ids: [id],
        },
      });
      const mock_api = mock_apis.at(0);

      if (!mock_api) {
        throw new MockApiException({
          public_message: "Mock API not found.",
          status_code: HttpStatusCode.NOT_FOUND,
        });
      }

      return mock_api;
    },
    getMockApis: async (
      filters: MockApiFilters,
      pagination: MockApiPagination,
      sort: MockApiSort,
    ) => {
      const [total, records] = await Promise.all([
        mock_apis_repository.count({
          filters,
        }),
        mock_apis_repository.list({
          filters,
          pagination,
          sort,
          columns: [
            "id",
            "project_id",
            "method",
            "path",
            "name",
            "description",
            "created_at",
          ],
        }),
      ]);
      return {
        total,
        records,
      };
    },
    updateMockApi(id: string, input: MockApiInput): Promise<void> {
      return mock_apis_repository.update(id, input);
    },
    deleteMockApi(id: string): Promise<void> {
      return mock_apis_repository.delete(id);
    },
  };
};
