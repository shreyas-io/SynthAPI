import {
  parseEnvironment,
  type Environment,
  type ParsedEnvironment,
} from "./environment";
import {
  createPostgresDatabase,
  type DatabaseClient,
} from "./infrastructure/kysely";
import { ChatSessions } from "./sdk/handlers/chat_sessions";
import { ChatTurnBlobs } from "./sdk/handlers/chat_turn_blobs";
import { ChatTurnEvents } from "./sdk/handlers/chat_turn_events";
import { TextGeneration } from "./sdk/handlers/text_generation";

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
    chat_sessions: ChatSessions(ctx),
    chat_turn_blobs: ChatTurnBlobs(ctx),
    chat_turn_events: ChatTurnEvents(ctx),
    text_generation: TextGeneration(ctx),
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
