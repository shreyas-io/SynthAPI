import { createPyodideWorkerPool } from "../../infrastructure/pyodide";
import type { ApiGatewayDatabase } from "../../infrastructure/kysely";
import type { IKeyValueStore } from "../../domain/interfaces/kv_store";
import { MockApiResponsesApplication } from "./mock_api_responses";
import { MockApisApplication } from "./mock_apis";
import { ProjectsApplication } from "./projects";

type MockApiApplicationDependencies = {
  database: ApiGatewayDatabase;
  keyValueStore: IKeyValueStore;
};

export const createMockApiApplication = (
  dependencies: MockApiApplicationDependencies,
) => {
  const pyodide = createPyodideWorkerPool({
    size: 1,
    max_queue_size: 100,
    worker_memory_limit_mb: 28,
    worker_boot_timeout_ms: 10_000,
  });
  const ctx = {
    ...dependencies,
    pyodide,
  };

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
    destroy: async () => {
      await pyodide.destroy();
    },
  };
};
