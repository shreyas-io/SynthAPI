import type { AppContext } from "../../../../application/agent_orchestration/context";
import {
  ExecutionContextEt,
  QueryParams,
  RequestBodyEt,
} from "../../../entities/execution_context";
import { MockApiEt } from "../../../entities/mock_api";
import { ProjectEt } from "../../../entities/project";
import { VariableEt } from "../../../entities/variables";

export const LOCAL_VARIABLE_TTL_SECONDS = 60 * 60; // 1 hour
export const GLOBAL_VARIABLE_TTL_SECONDS = 24 * 60 * 60; // 24 hour

export const getLocalVarKey = (
  mock_api_id: string,
  variable_name: string,
): string => {
  return `api-${mock_api_id}:local-${variable_name}`;
};

export const getGlobalVarKey = (
  project_id: string,
  variable_name: string,
): string => {
  return `prj-${project_id}:global-${variable_name}`;
};

export async function upsertMockApiVariables(
  ctx: AppContext,
  mock_api: Pick<MockApiEt, "id" | "variables">,
  project: Pick<ProjectEt, "id" | "globals">,
) {
  const kv_store = ctx.keyValueStore;

  await Promise.all([
    Promise.all(
      (mock_api.variables ?? []).map(async (variable) => {
        const key = getLocalVarKey(mock_api.id, variable.name);
        await kv_store.upsertExpiring(key, variable.value, {
          ttl_seconds: LOCAL_VARIABLE_TTL_SECONDS,
        });
      }),
    ),
    Promise.all(
      (project.globals ?? []).map(async (variable) => {
        const key = getGlobalVarKey(project.id, variable.name);
        await kv_store.upsertExpiring(key, variable.value, {
          ttl_seconds: GLOBAL_VARIABLE_TTL_SECONDS,
        });
      }),
    ),
  ]);
}

const variablesToRecord = async (
  variables: VariableEt[] | null,
  getValue: (variable: VariableEt) => Promise<unknown>,
): Promise<Record<string, any>> => {
  const entries = await Promise.all(
    (variables ?? []).map(async (variable) => [
      variable.name,
      await getValue(variable),
    ]),
  );

  return Object.fromEntries(entries);
};

type MockApiExecutionRequest = {
  url: string;
  method: string;
  headers: Record<string, any>;
  query_params: QueryParams;
  body: RequestBodyEt;
  path_params: Record<string, string>;
  cookies: Record<string, any>;
};

export async function getMockApiExecutionContext(
  ctx: AppContext,
  mock_api: Pick<MockApiEt, "id" | "variables">,
  project: Pick<ProjectEt, "id" | "globals" | "constants">,
  request?: MockApiExecutionRequest,
): Promise<ExecutionContextEt> {
  const kv_store = ctx.keyValueStore;

  const [variables, globals] = await Promise.all([
    variablesToRecord(mock_api.variables, async (variable) => {
      const key = getLocalVarKey(mock_api.id, variable.name);
      return (await kv_store.get(key)) ?? variable.value;
    }),
    variablesToRecord(project.globals, async (variable) => {
      const key = getGlobalVarKey(project.id, variable.name);
      return (await kv_store.get(key)) ?? variable.value;
    }),
  ]);

  return {
    request: {
      url: request?.url ?? "",
      method: request?.method ?? "",
      headers: request?.headers ?? {},
      query_params: request?.query_params ?? {},
      body: request?.body ?? { type: "empty" },
      path_params: request?.path_params ?? {},
      cookies: request?.cookies ?? {},
    },
    response: {
      status_code: 200,
      headers: {},
      body: { type: "empty" },
      cookies: {},
    },
    globals,
    constants: Object.fromEntries(
      (project.constants ?? []).map((variable) => [
        variable.name,
        variable.value,
      ]),
    ),
    variables,
  };
}
