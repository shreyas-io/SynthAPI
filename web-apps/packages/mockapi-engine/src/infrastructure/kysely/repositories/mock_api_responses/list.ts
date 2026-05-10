import type { IMockApiResponsesRepository } from "../../../../domain/entities/interfaces/repositories/mock_api_responses";
import type { MockApiResponseEt } from "../../../../domain/entities/mock_api_response/mock_api_response";
import type { DatabaseClient } from "../../index";

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

type ColumnKeys = Extract<keyof MockApiResponseEt, string>;

export const list = (
  client: DatabaseClient,
): IMockApiResponsesRepository["list"] => {
  async function listMockApiResponses(params: {
    filters: MockApiResponseFilters;
    pagination?: MockApiResponsePagination;
    sort?: MockApiResponseSort;
  }): Promise<MockApiResponseEt[]>;
  async function listMockApiResponses<C extends readonly ColumnKeys[]>(params: {
    filters: MockApiResponseFilters;
    columns: C;
    pagination?: MockApiResponsePagination;
    sort?: MockApiResponseSort;
  }): Promise<Pick<MockApiResponseEt, C[number]>[]>;
  async function listMockApiResponses<C extends readonly ColumnKeys[]>({
    filters,
    columns,
    pagination,
    sort,
  }: {
    filters: MockApiResponseFilters;
    columns?: C;
    pagination?: MockApiResponsePagination;
    sort?: MockApiResponseSort;
  }): Promise<MockApiResponseEt[] | Pick<MockApiResponseEt, C[number]>[]> {
    if (!filters.ids?.length && !filters.mock_api_ids?.length && !filters.name)
      return [];

    let query = client.db.selectFrom("mock_api_responses");

    if (columns?.length) {
      query = query.select(columns);
    } else {
      query = query.selectAll();
    }

    if (filters.ids?.length) {
      query = query.where("id", "in", filters.ids);
    }

    if (filters.mock_api_ids?.length) {
      query = query.where("mock_api_id", "in", filters.mock_api_ids);
    }

    if (filters.name) {
      query = query.where("name", "ilike", `%${filters.name}%`);
    }

    if (sort?.by) {
      query = query.orderBy(sort.by, sort.order);
    }

    if (pagination?.limit) {
      query = query.limit(pagination.limit).offset(pagination.offset);
    }

    const rows = await query.execute();

    return rows as MockApiResponseEt[] | Pick<MockApiResponseEt, ColumnKeys>[];
  }

  return listMockApiResponses;
};
