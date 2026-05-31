import { MockApiException } from "../../domain/exceptions/exception";
import { executePublicMockApi } from "../../domain/usecases/mock_api/execution";
import { MockApisUsecase } from "../../domain/usecases/mock_api/apis";
import type { MockApiContext } from "./context";
import {
  createMockApiDto,
  executeMockApiDto,
  executePublicMockApiDto,
  listMockApisFilterDto,
  listMockApisPaginationDto,
  listMockApisSortDto,
} from "./validation/mock_api";

type MockApiFilters = {
  ids?: string[];
  project_ids?: string[];
  method?: string;
  path?: string;
  name?: string;
  description?: string;
};

export function MockApisApplication(ctx: MockApiContext) {
  const mock_apis = MockApisUsecase(ctx);

  return {
    createMockApi: (data: unknown) => {
      const { data: input, success, error } = createMockApiDto.safeParse(data);

      if (!success) {
        throw new MockApiException({
          public_message: JSON.stringify(error.issues),
        });
      }

      return mock_apis.createMockApi({
        method: input.method,
        path: input.path,
        name: input.name,
        description: input.description,
        project_id: input.project_id,
        variables: input.variables ?? null,
      });
    },
    getMockApi: (id: string) => mock_apis.getMockApi(id),
    listMockApis: (filters: unknown, pagination: unknown, sort: unknown) => {
      const {
        data: parsed_filters,
        success: filters_success,
        error: filters_error,
      } = listMockApisFilterDto.safeParse(filters);
      if (!filters_success) {
        throw new MockApiException({
          public_message: JSON.stringify(filters_error.issues),
        });
      }

      const {
        data: parsed_pagination,
        success: pagination_success,
        error: pagination_error,
      } = listMockApisPaginationDto.safeParse(pagination);
      if (!pagination_success) {
        throw new MockApiException({
          public_message: JSON.stringify(pagination_error.issues),
        });
      }

      const {
        data: parsed_sort,
        success: sort_success,
        error: sort_error,
      } = listMockApisSortDto.safeParse(sort);
      if (!sort_success) {
        throw new MockApiException({
          public_message: JSON.stringify(sort_error.issues),
        });
      }

      const mock_api_filters: MockApiFilters = {};

      if (parsed_filters.ids?.length) mock_api_filters.ids = parsed_filters.ids;
      if (parsed_filters.project_ids?.length) {
        mock_api_filters.project_ids = parsed_filters.project_ids;
      }
      if (parsed_filters.method) mock_api_filters.method = parsed_filters.method;
      if (parsed_filters.path) mock_api_filters.path = parsed_filters.path;
      if (parsed_filters.name) mock_api_filters.name = parsed_filters.name;
      if (parsed_filters.description) {
        mock_api_filters.description = parsed_filters.description;
      }

      return mock_apis.getMockApis(
        mock_api_filters,
        parsed_pagination,
        parsed_sort,
      );
    },
    updateMockApi: (id: string, data: unknown) => {
      const { data: input, success, error } = createMockApiDto.safeParse(data);

      if (!success) {
        throw new MockApiException({
          public_message: JSON.stringify(error.issues),
        });
      }

      return mock_apis.updateMockApi(id, {
        method: input.method,
        path: input.path,
        name: input.name,
        description: input.description,
        project_id: input.project_id,
        variables: input.variables ?? null,
      });
    },
    deleteMockApi: (id: string) => mock_apis.deleteMockApi(id),
    executeMockApi: (id: string, data: unknown) => {
      const { data: input, success, error } = executeMockApiDto.safeParse(data);

      if (!success) {
        throw new MockApiException({
          public_message: JSON.stringify(error.issues),
        });
      }

      return Promise.resolve({
        mock_api_id: id,
        request: input,
      });
    },
    executePublicMockApi: (data: unknown) => {
      const { data: input, success, error } =
        executePublicMockApiDto.safeParse(data);

      if (!success) {
        throw new MockApiException({
          public_message: JSON.stringify(error.issues),
        });
      }

      return executePublicMockApi(ctx, input);
    },
  };
}
