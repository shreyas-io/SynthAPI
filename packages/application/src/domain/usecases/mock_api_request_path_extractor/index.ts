import {
  ExtractMockApiRequestPathInput,
  MockApiRequestPathExtractor,
} from "../../ports/mock_api_request_path_extractor";
import { QueryParams } from "../../entities/query_params";

const mockUrlBase = "http://mock.local";

export class MockApiRequestPathMismatchError extends Error {
  constructor(configuredPath: string, rawPath: string) {
    super(`Runtime path "${rawPath}" does not match mock API path "${configuredPath}"`);
  }
}

const splitPath = (path: string): string[] => {
  if (path === "/") {
    return [];
  }

  const normalized = path.endsWith("/") ? path.slice(0, -1) : path;

  return normalized
    .split("/")
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment));
};

const parseQueryParams = (searchParams: URLSearchParams): QueryParams => {
  const queryParams: QueryParams = {};

  searchParams.forEach((value, key) => {
    const existingValue = queryParams[key];

    if (existingValue === undefined) {
      queryParams[key] = value;
      return;
    }

    if (Array.isArray(existingValue)) {
      queryParams[key] = [...existingValue, value];
      return;
    }

    queryParams[key] = [existingValue, value];
  });

  return queryParams;
};

const cloneQueryParams = (queryParams: QueryParams): QueryParams =>
  Object.fromEntries(
    Object.entries(queryParams).map(([key, value]) => [
      key,
      Array.isArray(value) ? [...value] : value,
    ]),
  );

const extractPathParams = (
  configuredPath: string,
  rawPath: string,
): Record<string, string> => {
  const configuredSegments = splitPath(configuredPath);
  const rawSegments = splitPath(rawPath);

  if (configuredSegments.length !== rawSegments.length) {
    throw new MockApiRequestPathMismatchError(configuredPath, rawPath);
  }

  const pathParams: Record<string, string> = {};

  configuredSegments.forEach((configuredSegment, index) => {
    const rawSegment = rawSegments[index];

    if (rawSegment === undefined) {
      throw new MockApiRequestPathMismatchError(configuredPath, rawPath);
    }

    if (configuredSegment.startsWith(":")) {
      pathParams[configuredSegment.slice(1)] = rawSegment;
      return;
    }

    if (configuredSegment !== rawSegment) {
      throw new MockApiRequestPathMismatchError(configuredPath, rawPath);
    }
  });

  return pathParams;
};

export const createMockApiRequestPathExtractor =
  (): MockApiRequestPathExtractor => ({
    extract(input: ExtractMockApiRequestPathInput) {
      const url = new URL(input.runtime_url, mockUrlBase);
      const rawPath = url.pathname;
      const runtimeQueryParams = parseQueryParams(url.searchParams);

      return {
        raw_path: rawPath,
        query_params: {
          ...cloneQueryParams(input.configured_query_params ?? {}),
          ...runtimeQueryParams,
        },
        path_params: extractPathParams(input.configured_path, rawPath),
      };
    },
  });
