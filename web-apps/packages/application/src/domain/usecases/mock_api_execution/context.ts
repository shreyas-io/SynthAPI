import { AppContext } from "../../..";
import { ExecutionContextEt } from "../../entities/execution_context";
import { MockApiEt } from "../../entities/mock_api";
import { ProjectEt } from "../../entities/project";
import { VariableEt } from "../../entities/variables";

const LOCAL_VARIABLE_TTL_SECONDS = 60 * 60; // 1 hour
const GLOBAL_VARIABLE_TTL_SECONDS = 24 * 60 * 60; // 24 hour

const getLocalVarKey = (mock_api_id: string, variable_name: string): string => {
  return `id-${mock_api_id}:local-${variable_name}`;
};

const getGlobalVarKey = (project_id: string, variable_name: string): string => {
  return `id-${project_id}:global-${variable_name}`;
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

export async function getMockApiExecutionContext(
  ctx: AppContext,
  mock_api: Pick<MockApiEt, "id" | "variables">,
  project: Pick<ProjectEt, "id" | "globals" | "constants">,
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
      url: "",
      method: "",
      header: {},
      query: {},
      body: { type: "empty" },
      path_param: {},
      cookie: {},
    },
    response: {
      status_code: 200,
      header: {},
      body: { type: "empty" },
      cookie: {},
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
