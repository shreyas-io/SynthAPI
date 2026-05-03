import { ExecutionContext } from "../entities/execution_context";

export type ExtractMockApiRequestPathInput = {
  configured_path: string;
  configured_query_params?: ExecutionContext["query"];
  runtime_url: string;
};

export type ExtractMockApiRequestPathResult = {
  raw_path: string;
  query_params: ExecutionContext["query"];
  path_params: Record<string, string>;
};

export interface MockApiRequestPathExtractor {
  extract: (
    input: ExtractMockApiRequestPathInput,
  ) => ExtractMockApiRequestPathResult;
}
