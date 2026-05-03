import type { IMockApisRepository } from "../../../../domain/entities/interfaces/repositories/mock_apis";
import type { MockApiEt } from "../../../../domain/entities/mock_api";
import type { DatabaseClient } from "../../index";

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

type ColumnKeys = Extract<keyof MockApiEt, string>;

export const list = (client: DatabaseClient): IMockApisRepository["list"] => {
  async function listMockApis(params: {
    filters: MockApiFilters;
    pagination?: MockApiPagination;
    sort?: MockApiSort;
  }): Promise<MockApiEt[]>;
  async function listMockApis<C extends readonly ColumnKeys[]>(params: {
    filters: MockApiFilters;
    columns: C;
    pagination?: MockApiPagination;
    sort?: MockApiSort;
  }): Promise<Pick<MockApiEt, C[number]>[]>;
  async function listMockApis<C extends readonly ColumnKeys[]>({
    filters,
    columns,
    pagination,
    sort,
  }: {
    filters: MockApiFilters;
    columns?: C;
    pagination?: MockApiPagination;
    sort?: MockApiSort;
  }): Promise<MockApiEt[] | Pick<MockApiEt, C[number]>[]> {
    if (
      !filters.ids?.length &&
      !filters.project_ids?.length &&
      !filters.method &&
      !filters.path &&
      !filters.name &&
      !filters.description
    )
      return [];

    let query = client.db.selectFrom("mock_apis");

    if (columns?.length) {
      query = query.select(columns);
    } else {
      query = query.selectAll();
    }

    if (filters.ids?.length) {
      query = query.where("id", "in", filters.ids);
    }

    if (filters.project_ids?.length) {
      query = query.where("project_id", "in", filters.project_ids);
    }

    if (filters.method) {
      query = query.where("method", "=", filters.method);
    }

    if (filters.path) {
      query = query.where("path", "ilike", `%${filters.path}%`);
    }

    if (filters.name) {
      query = query.where("name", "ilike", `%${filters.name}%`);
    }

    if (filters.description) {
      query = query.where("description", "ilike", `%${filters.description}%`);
    }

    if (sort?.by) {
      query = query.orderBy(sort.by, sort.order);
    }

    if (pagination?.limit) {
      query = query.limit(pagination.limit).offset(pagination.offset);
    }

    const rows = await query.execute();

    return rows as MockApiEt[] | Pick<MockApiEt, ColumnKeys>[];
  }

  return listMockApis;
};
