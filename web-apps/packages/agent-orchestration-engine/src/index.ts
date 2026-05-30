import {
  parseEnvironment,
  type Environment,
  type ParsedEnvironment,
} from "./environment";
import { type IEventBus } from "./domain/entities/interfaces/event_bus";
import { type IToolExecutor } from "./domain/entities/interfaces/tool_executor";
import {
  createPostgresDatabase,
  type DatabaseClient,
} from "./infrastructure/kysely";
import { InMemoryEventBus } from "./infrastructure/event_bus";
import { runMigrations } from "./run_migrations";
import { AgentChat } from "./sdk/handlers/agent_chat";
import { ChatSessions } from "./sdk/handlers/chat_sessions";
import { ChatTurnBlobs } from "./sdk/handlers/chat_turn_blobs";
import { ChatTurnEvents } from "./sdk/handlers/chat_turn_events";
import { TextGeneration } from "./sdk/handlers/text_generation";

type ApplicationDependencies = {
  environment: Environment;
  toolExecutor?: IToolExecutor;
  eventBus?: IEventBus;
};

export type AppContext = Omit<ApplicationDependencies, "environment"> & {
  environment: ParsedEnvironment;
  database: DatabaseClient;
};

export const createApplication = async (app: ApplicationDependencies) => {
  const environment = parseEnvironment(app.environment);
  const database = createPostgresDatabase({ app: { environment } });
  await runMigrations(database.db);
  const eventBus = app.eventBus ?? InMemoryEventBus();
  const ctx: AppContext = {
    ...app,
    environment,
    database,
    eventBus,
  };

  return {
    agent_chat: AgentChat(ctx),
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
