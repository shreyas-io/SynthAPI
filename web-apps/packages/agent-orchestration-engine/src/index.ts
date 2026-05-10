import {
  parseEnvironment,
  type Environment,
  type ParsedEnvironment,
} from "./environment";
import {
  createPostgresDatabase,
  type DatabaseClient,
} from "./infrastructure/kysely";

type ApplicationDependencies = {
  environment: Environment;
};

export type AppContext = Omit<ApplicationDependencies, "environment"> & {
  environment: ParsedEnvironment;
  database: DatabaseClient;
};

export const createApplication = (app: ApplicationDependencies) => {
  const environment = parseEnvironment(app.environment);
  const database = createPostgresDatabase({ app: { environment } });
  const ctx: AppContext = {
    ...app,
    environment,
    database,
  };

  return {
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
