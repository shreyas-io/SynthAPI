import type { KeyValueStore } from "./domain/ports/key_value_store";
import { parseEnvironment, type Environment } from "./environment";
import {
  createPostgresDatabase,
  type DatabaseClient,
} from "./infrastructure/kysely";

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
    ctx,
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
