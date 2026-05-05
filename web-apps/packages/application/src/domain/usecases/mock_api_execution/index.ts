import { AppContext } from "../../..";
import {
  HttpStatusCode,
  MockApiException,
} from "../../../exceptions/exception";
import { MockApiResponsesRepository } from "../../../infrastructure/kysely/repositories/mock_api_responses";
import { MockApisRepository } from "../../../infrastructure/kysely/repositories/mock_apis";
import { ProjectsRepository } from "../../../infrastructure/kysely/repositories/projects";
import { upsertMockApiVariables } from "./context";
import type { RequestBodyEt } from "../../entities/execution_context";
import type { MockApiEt } from "../../entities/mock_api";

type PublicMockApiRequest = {
  project_slug: string;
  method: string;
  url: string;
  headers: Record<string, any>;
  body: RequestBodyEt;
  cookies: Record<string, any>;
};

type ParsedPath = {
  path: string;
  query_keys: Set<string>;
};

type Match = {
  mock_api: Pick<MockApiEt, "id" | "path" | "created_at" | "variables">;
  static_segments: number;
  dynamic_segments: number;
  path_length: number;
  query_key_count: number;
};

const normalizePath = (path: string): string => {
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }

  return path || "/";
};

const parsePath = (path: string): ParsedPath => {
  const [raw_path = "", raw_query = ""] = path.split("?");
  const params = new URLSearchParams(raw_query);

  return {
    path: normalizePath(raw_path || "/"),
    query_keys: new Set([...params.keys()]),
  };
};

const parseRuntimeUrl = (url: string): ParsedPath => {
  const parsed = new URL(url, "http://mock.local");

  return {
    path: normalizePath(parsed.pathname),
    query_keys: new Set([...parsed.searchParams.keys()]),
  };
};

const getPathMatch = (
  configured_path: string,
  runtime_path: string,
):
  | Pick<Match, "static_segments" | "dynamic_segments" | "path_length">
  | null => {
  const configured_segments = normalizePath(configured_path)
    .split("/")
    .filter(Boolean);
  const runtime_segments = normalizePath(runtime_path)
    .split("/")
    .filter(Boolean);

  if (configured_segments.length !== runtime_segments.length) {
    return null;
  }

  let static_segments = 0;
  let dynamic_segments = 0;

  for (const [index, configured_segment] of configured_segments.entries()) {
    const runtime_segment = runtime_segments[index];

    if (configured_segment.startsWith(":")) {
      dynamic_segments += 1;
      continue;
    }

    if (configured_segment !== runtime_segment) {
      return null;
    }

    static_segments += 1;
  }

  return {
    static_segments,
    dynamic_segments,
    path_length: configured_segments.length,
  };
};

const getBestMatch = (
  mock_apis: Pick<MockApiEt, "id" | "path" | "created_at" | "variables">[],
  runtime_url: string,
): Pick<MockApiEt, "id" | "path" | "created_at" | "variables"> | null => {
  const runtime = parseRuntimeUrl(runtime_url);
  const matches: Match[] = [];

  for (const mock_api of mock_apis) {
    const configured = parsePath(mock_api.path);
    const path_match = getPathMatch(configured.path, runtime.path);

    if (!path_match) {
      continue;
    }

    if (
      [...configured.query_keys].some((key) => !runtime.query_keys.has(key))
    ) {
      continue;
    }

    matches.push({
      mock_api,
      ...path_match,
      query_key_count: configured.query_keys.size,
    });
  }

  matches.sort((a, b) => {
    return (
      b.query_key_count - a.query_key_count ||
      b.static_segments - a.static_segments ||
      a.dynamic_segments - b.dynamic_segments ||
      b.path_length - a.path_length ||
      b.mock_api.created_at.getTime() - a.mock_api.created_at.getTime()
    );
  });

  return matches.at(0)?.mock_api ?? null;
};

export async function executePublicMockApi(
  ctx: AppContext,
  request_data: PublicMockApiRequest,
) {
  const mock_api_repo = MockApisRepository(ctx.database);
  const mock_api_response_repo = MockApiResponsesRepository(ctx.database);
  const projects_repo = ProjectsRepository(ctx.database);

  const project = (
    await projects_repo.list({
      filters: {
        slug: request_data.project_slug,
      },
      columns: ["id", "globals"],
    })
  ).at(0);

  if (!project) {
    throw new MockApiException({
      public_message: "Project not found.",
      status_code: HttpStatusCode.NOT_FOUND,
    });
  }

  const candidates = await mock_api_repo.list({
    filters: {
      project_ids: [project.id],
      method: request_data.method,
    },
    columns: ["id", "path", "created_at", "variables"],
  });
  const mock_api = getBestMatch(candidates, request_data.url);

  if (!mock_api) {
    throw new MockApiException({
      public_message: "Mock API not found.",
      status_code: HttpStatusCode.NOT_FOUND,
    });
  }

  await upsertMockApiVariables(
    ctx,
    { id: mock_api.id, variables: mock_api.variables },
    { id: project.id, globals: project.globals },
  );

  const mock_api_response = (
    await mock_api_response_repo.list({
      filters: {
        mock_api_ids: [mock_api.id],
      },
      sort: {
        by: "created_at",
        order: "desc",
      },
    })
  ).at(0);

  if (!mock_api_response) {
    throw new MockApiException({
      public_message: "Mock API response not found.",
      status_code: HttpStatusCode.NOT_FOUND,
    });
  }

  return {
    mock_api_id: mock_api.id,
    status_code: mock_api_response.response.status_code,
    headers: mock_api_response.response.headers,
    cookies: mock_api_response.response.cookies,
    body: mock_api_response.response.body,
  };
}

async function executeMockApi(ctx: AppContext, id: string, request_data: any) {
  /**
   * First, get the mock api response with this id and then fetch the mock api
   * Second, check redis if all variables for this mock api exist...
   * ...and update TTL for all that exist, else insert again with default values.
   * Third, we map all the inputs of this request - URL, request body, headers, cookies
   * Fourth, we check if rate limited or not.
   */

  const mock_api_repo = MockApisRepository(ctx.database);
  const projects_repo = ProjectsRepository(ctx.database);

  const mock_api = (
    await mock_api_repo.list({
      filters: { ids: [id] },
      columns: ["project_id", "variables"],
    })
  ).at(0);

  if (!mock_api) {
    throw new MockApiException({
      public_message: `Mock API not found with ID '${id}'`,
      status_code: HttpStatusCode.NOT_FOUND,
    });
  }

  const project = (
    await projects_repo.list({
      filters: {
        ids: [mock_api.project_id],
      },
      columns: ["constants", "globals"],
    })
  ).at(0);

  if (!project) {
    throw new MockApiException({
      public_message: `Associated project with ID '${mock_api.project_id}' not found for Mock API with ID '${id}'`,
      status_code: HttpStatusCode.NOT_FOUND,
    });
  }

  await upsertMockApiVariables(
    ctx,
    { ...mock_api, id },
    { ...project, id: mock_api.project_id },
  );
}
