import type { DatabaseClient } from "./infrastructure/kysely";
import type { KeyValueStore } from "./domain/ports/key_value_store";
import { parseEnvironment, type Environment } from "./environment";
export {
  environmentSchema,
  parseEnvironment,
  type Environment,
} from "./environment";
export {
  type KeyValueStore,
  type KeyValueStoreSetOptions,
} from "./domain/ports/key_value_store";
export {
  createPostgresDatabase,
  type Database,
  type DatabaseClient,
  type DatabaseConfig,
  type DatabaseHealthResult,
} from "./infrastructure/kysely";

export type Greeting = {
  message: string;
  target: string;
};

export type ApplicationDependencies = {
  environment: Environment;
  keyValueStore: KeyValueStore;
};

export type AppContext = ApplicationDependencies;

export const createApplication = (app: ApplicationDependencies) => {
  parseEnvironment(app.environment);

  return {
    async getHealth() {
      try {
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
