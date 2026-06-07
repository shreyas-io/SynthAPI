import type { ApiGatewayDatabase } from "../../infrastructure/kysely";
import type { IKeyValueStore } from "../../domain/interfaces/kv_store";
import type { PyodideWorkerPool } from "../../infrastructure/pyodide";
import { InMemoryEventBus } from "../../infrastructure/agent_orchestration/event_bus";
import { MockApiResponsesApplication } from "./mock_api_responses";
import { MockApisApplication } from "./mock_apis";
import { ProjectsApplication } from "./projects";
import type { AppContext } from "../agent_orchestration/context";

type MockApiApplicationDependencies = {
  database: ApiGatewayDatabase;
  keyValueStore: IKeyValueStore;
  pyodide: PyodideWorkerPool;
};

export const createMockApiApplication = (
  dependencies: MockApiApplicationDependencies,
) => {
  const ctx = {
    ...dependencies,
    environment: {
      CLOUDFLARE_ACCOUNT_ID: "",
      CLOUDFLARE_AI_GATEWAY_ID: "",
      CLOUDFLARE_AI_GATEWAY_TOKEN: "",
      OPENROUTER_API_KEY: "",
      OLLAMA_BASE_URL: undefined,
    },
    eventBus: InMemoryEventBus(),
  } satisfies AppContext;

  return {
    mock_apis: MockApisApplication(ctx),
    projects: ProjectsApplication(ctx),
    mock_api_responses: MockApiResponsesApplication(ctx),
    async getHealth() {
      try {
        await dependencies.database.checkHealth();

        return {
          status: "ok",
          database: "ok",
        };
      } catch {
        return {
          status: "ok",
          database: "error",
        };
      }
    },
    destroy: async () => {},
  };
};
