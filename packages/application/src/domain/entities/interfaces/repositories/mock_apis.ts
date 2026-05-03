import type { MockApiEt } from "../../mock_api";

type MockApiInput = Pick<
  MockApiEt,
  "project_id" | "method" | "path" | "name" | "description"
>;
type ColumnKeys = Extract<keyof MockApiEt, string>;

export interface IMockApisRepository {
  count: (params: {
    filters: {
      ids?: string[];
      project_ids?: string[];
      method?: string;
      path?: string;
      name?: string;
      description?: string;
    };
  }) => Promise<number>;
  create: (input: MockApiInput) => Promise<string>;
  list: {
    (params: {
      filters: {
        ids?: string[];
        project_ids?: string[];
        method?: string;
        path?: string;
        name?: string;
        description?: string;
      };
      pagination?: {
        limit: number;
        offset: number;
      };
      sort?: {
        by: "name" | "created_at";
        order: "asc" | "desc";
      };
    }): Promise<MockApiEt[]>;
    <C extends readonly ColumnKeys[]>(params: {
      filters: {
        ids?: string[];
        project_ids?: string[];
        method?: string;
        path?: string;
        name?: string;
        description?: string;
      };
      columns: C;
      pagination?: {
        limit: number;
        offset: number;
      };
      sort?: {
        by: "name" | "created_at";
        order: "asc" | "desc";
      };
    }): Promise<Pick<MockApiEt, C[number]>[]>;
  };
  update: (id: string, input: MockApiInput) => Promise<void>;
  delete: (id: string) => Promise<void>;
}
