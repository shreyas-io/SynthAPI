import type { KeyValueStore } from "./domain/ports/key_value_store";
import {
  parseEnvironment,
  type Environment,
  type ParsedEnvironment,
} from "./environment";
import {
  createPostgresDatabase,
  type DatabaseClient,
} from "./infrastructure/kysely";
import {
  createPyodideWorkerPool,
  type PyodideWorkerPool,
} from "./infrastructure/pyodide";
import { MockApiResponses } from "./sdk/handlers/mock_api_responses";
import { MockApis } from "./sdk/handlers/mock_apis";
import { Projects } from "./sdk/handlers/projects";

type ApplicationDependencies = {
  environment: Environment;
  keyValueStore: KeyValueStore;
};

export type AppContext = Omit<ApplicationDependencies, "environment"> & {
  environment: ParsedEnvironment;
  database: DatabaseClient;
  pyodide: PyodideWorkerPool;
};

export const createApplication = (app: ApplicationDependencies) => {
  const environment = parseEnvironment(app.environment);
  const pyodide = createPyodideWorkerPool({
    size: 1,
    max_queue_size: 100,
    worker_memory_limit_mb: 28,
    worker_boot_timeout_ms: 10_000,
  });
  const database = createPostgresDatabase({ app: { environment } });
  const ctx: AppContext = {
    ...app,
    environment,
    database,
    pyodide,
  };

  return {
    mock_apis: MockApis(ctx),
    projects: Projects(ctx),
    mock_api_responses: MockApiResponses(ctx),
    async getHealth() {
      try {
        await database.checkHealth();

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
      await database.destroy();
      await pyodide.destroy();
    },
  };
};
