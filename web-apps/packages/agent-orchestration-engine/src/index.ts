import {
  parseEnvironment,
  type Environment,
  type ParsedEnvironment,
} from "./environment";
import {
  createPostgresDatabase,
  type DatabaseClient,
} from "./infrastructure/kysely";
import { AgentConfigs } from "./sdk/handlers/agent_configs";
import { ChatSessions } from "./sdk/handlers/chat_sessions";
import { ChatSessionTurns } from "./sdk/handlers/chat_session_turns";
import { ChatTurnBlobs } from "./sdk/handlers/chat_turn_blobs";
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
    agent_configs: AgentConfigs(ctx),
    chat_sessions: ChatSessions(ctx),
    chat_session_turns: ChatSessionTurns(ctx),
    chat_turn_blobs: ChatTurnBlobs(ctx),
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
