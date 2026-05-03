import type { KeyValueStore } from "./domain/ports/key_value_store";
import { parseEnvironment, type Environment } from "./environment";
import {
  createPostgresDatabase,
  type DatabaseClient,
} from "./infrastructure/kysely";
import { MockApis } from "./sdk/handlers/mock_apis";
import { Projects } from "./sdk/handlers/projects";

type ApplicationDependencies = {
  environment: Environment;
  keyValueStore: KeyValueStore;
};

export type AppContext = ApplicationDependencies & {
  database: DatabaseClient;
};

export const createApplication = (app: ApplicationDependencies) => {
  parseEnvironment(app.environment);
  const database = createPostgresDatabase({ app });
  const ctx: AppContext = {
    ...app,
    database,
  };

  return {
    mock_apis: MockApis(ctx),
    projects: Projects(ctx),
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
    },
  };
};
