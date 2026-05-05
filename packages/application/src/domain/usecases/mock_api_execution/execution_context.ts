import { AppContext } from "../../..";
import { MockApiEt } from "../../entities/mock_api";
import { ProjectEt } from "../../entities/project";

const LOCAL_VARIABLE_TTL_SECONDS = 60 * 60; // 1 hour
const GLOBAL_VARIABLE_TTL_SECONDS = 24 * 60 * 60; // 24 hour

const getLocalVarKey = (mock_api_id: string, variable_name: string): string => {
  return `id-${mock_api_id}:local-${variable_name}`;
};

const getGlobalVarKey = (project_id: string, variable_name: string): string => {
  return `id-${project_id}:global-${variable_name}`;
};

// export async function buildMockApiExecutionContext(
//   ctx: AppContext,
//   mock_api: Pick<MockApiEt, "id" | "variables">,
//   project: Pick<ProjectEt, "id" | "globals">,
// ) {
//   const kv_store = ctx.keyValueStore;

//   // First, get all local, global and constants from the KV store
//   await Promise.all([
//     Promise.all(
//       (mock_api.variables ?? []).map(async (variable) => {
//         const key = getLocalVarKey(mock_api.id, variable.name);
//         await kv_store.upsertExpiring(key, JSON.stringify(variable.value), {
//           ttl_seconds: LOCAL_VARIABLE_TTL_SECONDS,
//         });
//       }),
//     ),
//     Promise.all(
//       (project.globals ?? []).map(async (variable) => {
//         const key = getGlobalVarKey(project.id, variable.name);
//         await kv_store.upsertExpiring(key, JSON.stringify(variable.value), {
//           ttl_seconds: GLOBAL_VARIABLE_TTL_SECONDS,
//         });
//       }),
//     ),
//   ]);
// }
