import { AppContext } from "../..";
import { MockApisUsecase } from "../../domain/usecases/mock_apis";
import { MockApiException } from "../../exceptions/exception";
import {
  createMockApiDto,
  listMockApisFilterDto,
  listMockApisPaginationDto,
  listMockApisSortDto,
} from "../dto/mock_api";

type MockApiFilters = {
  ids?: string[];
  project_ids?: string[];
  method?: string;
  path?: string;
  name?: string;
  description?: string;
};

export function MockApis(ctx: AppContext) {
  const mock_apis = MockApisUsecase(ctx);

  return {
    createMockApi: (data: unknown) => {
      const { data: v, success, error } = createMockApiDto.safeParse(data);

      if (!success)
        throw new MockApiException({
          public_message: JSON.stringify(error.issues),
        });

      return mock_apis.createMockApi(v);
    },
    getMockApi: (id: string) => mock_apis.getMockApi(id),
    listMockApis: (filters: unknown, pagination: unknown, sort: unknown) => {
      const {
        data: f,
        success: s_0,
        error: e_0,
      } = listMockApisFilterDto.safeParse(filters);
      if (!s_0)
        throw new MockApiException({
          public_message: JSON.stringify(e_0.issues),
        });

      const {
        data: p,
        success: s_1,
        error: e_1,
      } = listMockApisPaginationDto.safeParse(pagination);
      if (!s_1)
        throw new MockApiException({
          public_message: JSON.stringify(e_1.issues),
        });

      const {
        data: s,
        success: s_2,
        error: e_2,
      } = listMockApisSortDto.safeParse(sort);
      if (!s_2)
        throw new MockApiException({
          public_message: JSON.stringify(e_2.issues),
        });

      const mockApiFilters: MockApiFilters = {};

      if (f.ids?.length) {
        mockApiFilters.ids = f.ids;
      }

      if (f.project_ids?.length) {
        mockApiFilters.project_ids = f.project_ids;
      }

      if (f.method) {
        mockApiFilters.method = f.method;
      }

      if (f.path) {
        mockApiFilters.path = f.path;
      }

      if (f.name) {
        mockApiFilters.name = f.name;
      }

      if (f.description) {
        mockApiFilters.description = f.description;
      }

      return mock_apis.getMockApis(mockApiFilters, p, s);
    },
    deleteMockApi: (id: string) => mock_apis.deleteMockApi(id),
    updateMockApi: (id: string, data: unknown) => {
      const { data: v, success, error } = createMockApiDto.safeParse(data);

      if (!success)
        throw new MockApiException({
          public_message: JSON.stringify(error.issues),
        });

      return mock_apis.updateMockApi(id, v);
    },
  };
}
