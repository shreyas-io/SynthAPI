import { ExecutionContextEt } from "../entities/execution_context";

export type ExtractMockApiRequestPathInput = {
  configured_path: string;
  configured_query_params?: ExecutionContextEt["request"]["query_params"];
  runtime_url: string;
};

export type ExtractMockApiRequestPathResult = {
  raw_path: string;
  query_params: ExecutionContextEt["request"]["query_params"];
  path_params: Record<string, string>;
};

export interface MockApiRequestPathExtractor {
  extract: (
    input: ExtractMockApiRequestPathInput,
  ) => ExtractMockApiRequestPathResult;
}
