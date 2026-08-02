import type { AppContext } from "../../../../context";
import {
  HttpStatusCode,
  MockApiException,
} from "../../../exceptions/exception";
import {
  sseStreamItemSchema,
  sseStreamItemsSchema,
  type SseStreamItemEt,
} from "../../../entities/mock_api_response/sse";
import { getMockApiExecutionContext, upsertMockApiVariables } from "./context";
import { executePostResponseActions } from "./post_response_actions";
import { executeRuleTree } from "./rule_engine/execute_rule_tree";
import { recursivelyMapTemplateParams } from "../utils/template_params";
import type {
  ExecutionContextEt,
  QueryParams,
  RequestBodyEt,
} from "../../../entities/execution_context";
import type { MockApiEt } from "../../../entities/mock_api";
import type { MockApiResponseEt } from "../../../entities/mock_api_response/mock_api_response";
import { z } from "zod";
import { logger } from "../../../../infrastructure/logger";
import { ProjectApiKeysUsecase } from "../project_api_keys";

type PublicMockApiRequest = {
  project_slug: string;
  method: string;
  url: string;
  headers: Record<string, any>;
  project_key?: string | undefined;
  body: RequestBodyEt;
  cookies: Record<string, any>;
};

type ParsedPath = {
  path: string;
  query_keys: Set<string>;
  query_params: QueryParams;
};

type Match = {
  mock_api: Pick<MockApiEt, "id" | "path" | "created_at" | "variables">;
  path_params: Record<string, string>;
  static_segments: number;
  dynamic_segments: number;
  path_length: number;
  query_key_count: number;
};

type MaterializedResponseBody =
  | { type: "json"; value: any }
  | { type: "text"; value: string }
  | { type: "empty" }
  | { type: "sse"; stream: AsyncIterable<SseStreamItemEt> };

const createStaticSseStream = (
  events: MockApiResponseEt["response"]["body"] & {
    type: "sse";
    mode: "events";
  },
  execution_context: ExecutionContextEt,
): AsyncIterable<SseStreamItemEt> => ({
  async *[Symbol.asyncIterator]() {
    for (const event of events.events) {
      const templatedEvent = recursivelyMapTemplateParams(
        event,
        execution_context,
      );
      const parsedEvent = sseStreamItemSchema.safeParse(templatedEvent);

      if (!parsedEvent.success) {
        throw new MockApiException({
          public_message: `SSE event configuration is invalid: ${JSON.stringify(z.treeifyError(parsedEvent.error))}`,
          status_code: HttpStatusCode.BAD_REQUEST,
        });
      }

      yield parsedEvent.data;
    }
  },
});

const createScriptSseStream = (
  ctx: AppContext,
  code: string,
  execution_context: ExecutionContextEt,
): AsyncIterable<SseStreamItemEt> => ({
  async *[Symbol.asyncIterator]() {
    const resp = await ctx.pythonCodeRunner.execute({
      code,
      max_exec_time_ms: 5000,
      context: execution_context,
    });
    const parsedEvents = sseStreamItemsSchema.safeParse(resp.result);

    if (!parsedEvents.success) {
      throw new MockApiException({
        public_message: `SSE script must return an array of valid stream items: ${JSON.stringify(z.treeifyError(parsedEvents.error))}`,
        status_code: HttpStatusCode.BAD_REQUEST,
      });
    }

    for (const event of parsedEvents.data) {
      yield event;
    }
  },
});

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
    query_params: getQueryParams(params),
  };
};

const parseRuntimeUrl = (url: string): ParsedPath => {
  const parsed = new URL(url, "http://mock.local");

  return {
    path: normalizePath(parsed.pathname),
    query_keys: new Set([...parsed.searchParams.keys()]),
    query_params: getQueryParams(parsed.searchParams),
  };
};

const getQueryParams = (params: URLSearchParams): QueryParams => {
  const query_params: QueryParams = {};

  for (const key of new Set([...params.keys()])) {
    const values = params.getAll(key);
    query_params[key] = values.length === 1 ? values[0]! : values;
  }

  return query_params;
};

const getPathMatch = (
  configured_path: string,
  runtime_path: string,
): Pick<
  Match,
  "path_params" | "static_segments" | "dynamic_segments" | "path_length"
> | null => {
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
  const path_params: Record<string, string> = {};

  for (const [index, configured_segment] of configured_segments.entries()) {
    const runtime_segment = runtime_segments[index];

    if (configured_segment.startsWith(":")) {
      dynamic_segments += 1;
      path_params[configured_segment.slice(1)] = runtime_segment!;
      continue;
    }

    if (configured_segment !== runtime_segment) {
      return null;
    }

    static_segments += 1;
  }

  return {
    path_params,
    static_segments,
    dynamic_segments,
    path_length: configured_segments.length,
  };
};

const getBestMatch = (
  mock_apis: Pick<MockApiEt, "id" | "path" | "created_at" | "variables">[],
  runtime_url: string,
):
  | (Pick<Match, "mock_api" | "path_params"> & {
      query_params: QueryParams;
    })
  | null => {
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

  const match = matches.at(0);

  if (!match) {
    return null;
  }

  return {
    mock_api: match.mock_api,
    path_params: match.path_params,
    query_params: runtime.query_params,
  };
};

const materializeResponseBody = async (
  ctx: AppContext,
  body: MockApiResponseEt["response"]["body"],
  execution_context: ExecutionContextEt,
): Promise<MaterializedResponseBody> => {
  if (body.type === "json_script") {
    const { result } = await ctx.pythonCodeRunner.execute({
      code: body.code,
      max_exec_time_ms: 5000,
      context: execution_context,
    });
    return {
      type: "json",
      value: result,
    };
  }

  if (body.type !== "sse") {
    return recursivelyMapTemplateParams(
      body,
      execution_context,
    ) as MaterializedResponseBody;
  }

  if (body.mode === "events") {
    return {
      type: "sse",
      stream: createStaticSseStream(body, execution_context),
    };
  }

  return {
    type: "sse",
    stream: createScriptSseStream(ctx, body.code, execution_context),
  };
};

export async function executePublicMockApi(
  ctx: AppContext,
  request_data: PublicMockApiRequest,
) {
  const project = await ctx.db
    .selectFrom("projects")
    .innerJoin("organizations", "organizations.id", "projects.organization_id")
    .select(["projects.id", "projects.globals", "projects.constants"])
    .where("projects.slug", "=", request_data.project_slug)
    .where("projects.deleted_at", "is", null)
    .where("organizations.deleted_at", "is", null)
    .executeTakeFirst();

  if (!project) {
    logger.error(`Project not found with ID: ${request_data.project_slug}`);
    throw new MockApiException({
      public_message: "Project not found.",
      status_code: HttpStatusCode.NOT_FOUND,
    });
  }

  const apiKeyValidation = await ProjectApiKeysUsecase(ctx).validateProjectApiKey(
    project.id,
    request_data.project_key,
  );

  if (!apiKeyValidation.valid) {
    throw new MockApiException({
      public_message: apiKeyValidation.required
        ? "Invalid or missing project API key."
        : "Project API key rejected.",
      status_code: HttpStatusCode.UNAUTHORIZED,
    });
  }

  const candidates = await ctx.db
    .selectFrom("mock_apis")
    .select(["id", "path", "created_at", "variables"])
    .where("project_id", "=", project.id)
    .where("method", "=", request_data.method)
    .where("deleted_at", "is", null)
    .execute();
  const match = getBestMatch(candidates, request_data.url);

  if (!match) {
    throw new MockApiException({
      public_message: "Mock API not found.",
      status_code: HttpStatusCode.NOT_FOUND,
    });
  }

  const { mock_api } = match;

  await upsertMockApiVariables(
    ctx,
    { id: mock_api.id, variables: mock_api.variables },
    { id: project.id, globals: project.globals },
  );

  const execution_context = await getMockApiExecutionContext(
    ctx,
    { id: mock_api.id, variables: mock_api.variables },
    { id: project.id, globals: project.globals, constants: project.constants },
    {
      url: request_data.url,
      method: request_data.method,
      headers: request_data.headers,
      query_params: match.query_params,
      body: request_data.body,
      path_params: match.path_params,
      cookies: request_data.cookies,
    },
  );

  const mock_api_responses = (await ctx.db
    .selectFrom("mock_api_responses")
    .selectAll()
    .where("mock_api_id", "=", mock_api.id)
    .where("deleted_at", "is", null)
    .orderBy("execution_order", "asc")
    .execute()) as unknown as MockApiResponseEt[];

  let mock_api_response: (typeof mock_api_responses)[number] | undefined;
  let default_mock_api_response:
    | (typeof mock_api_responses)[number]
    | undefined;

  for (const response of mock_api_responses) {
    if (response.is_default) {
      default_mock_api_response ??= response;
    }

    if (!response.rule_tree?.predicates) {
      mock_api_response = response;
      break;
    }

    const { result } = await executeRuleTree(
      ctx,
      response.rule_tree,
      execution_context,
    );

    if (result) {
      mock_api_response = response;
      break;
    }
  }

  mock_api_response ??= default_mock_api_response;

  if (!mock_api_response) {
    throw new MockApiException({
      public_message: "Mock API response not found.",
      status_code: HttpStatusCode.NOT_FOUND,
    });
  }

  execution_context.response = mock_api_response.response;

  const headers = recursivelyMapTemplateParams(
    mock_api_response.response.headers,
    execution_context,
  );

  const cookies = recursivelyMapTemplateParams(
    mock_api_response.response.cookies,
    execution_context,
  );
  const body = await materializeResponseBody(
    ctx,
    mock_api_response.response.body,
    execution_context,
  );

  await executePostResponseActions(ctx, {
    project_id: project.id,
    mock_api_id: mock_api.id,
    actions: mock_api_response.post_response_actions,
    execution_context,
  });

  let request_body_str = null;
  if (request_data.body.type === "json" || request_data.body.type === "form_urlencoded" || request_data.body.type === "multipart") {
    request_body_str = JSON.stringify(request_data.body.value);
  } else if (request_data.body.type === "text") {
    request_body_str = request_data.body.value;
  } else if (request_data.body.type === "binary") {
    request_body_str = `[Binary Data: ${request_data.body.value.mime_type}]`;
  }

  let response_body_str = null;
  if (body.type === "json") {
    response_body_str = JSON.stringify(body.value);
  } else if (body.type === "text") {
    response_body_str = body.value;
  } else if (body.type === "sse") {
    const sseBody = mock_api_response.response.body;
    if (sseBody.type === "sse" && sseBody.mode === "events") {
      response_body_str = JSON.stringify(sseBody.events);
    } else {
      response_body_str = "[SSE Script Stream]";
    }
  }

  ctx.mockApiRequestLogger.logRequest({
    project_id: project.id,
    mock_api_id: mock_api.id,
    method: request_data.method,
    url: request_data.url,
    request_headers: request_data.headers,
    request_body: request_body_str,
    response_status: mock_api_response.response.status_code,
    response_headers: headers,
    response_body: response_body_str,
  }).catch((err) => {
    logger.error({ err, project_id: project.id }, "Failed to enqueue request log");
  });

  return {
    mock_api_id: mock_api.id,
    status_code: mock_api_response.response.status_code,
    headers,
    cookies,
    body,
  };
}
