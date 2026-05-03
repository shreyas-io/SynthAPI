import type { MockApiResponseEt } from "../../mock_api_response";

type MockApiResponseInput = Pick<
  MockApiResponseEt,
  "mock_api_id" | "name" | "rule_tree" | "response" | "post_response_actions"
>;
type ColumnKeys = Extract<keyof MockApiResponseEt, string>;

export interface IMockApiResponsesRepository {
  count: (params: {
    filters: {
      ids?: string[];
      mock_api_ids?: string[];
      name?: string;
    };
  }) => Promise<number>;
  create: (input: MockApiResponseInput) => Promise<string>;
  list: {
    (params: {
      filters: {
        ids?: string[];
        mock_api_ids?: string[];
        name?: string;
      };
      pagination?: {
        limit: number;
        offset: number;
      };
      sort?: {
        by: "name" | "created_at";
        order: "asc" | "desc";
      };
    }): Promise<MockApiResponseEt[]>;
    <C extends readonly ColumnKeys[]>(params: {
      filters: {
        ids?: string[];
        mock_api_ids?: string[];
        name?: string;
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
    }): Promise<Pick<MockApiResponseEt, C[number]>[]>;
  };
  update: (id: string, input: MockApiResponseInput) => Promise<void>;
  delete: (id: string) => Promise<void>;
}
