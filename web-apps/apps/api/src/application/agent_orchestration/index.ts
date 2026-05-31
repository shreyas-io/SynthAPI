import type { ApiGatewayDatabase } from "../../infrastructure/kysely";
import { InMemoryEventBus } from "../../infrastructure/agent_orchestration/event_bus";
import { AgentChatApplication } from "./agent_chat";
import { ChatSessionsApplication } from "./chat_sessions";
import { ChatTurnBlobsApplication } from "./chat_turn_blobs";
import { ChatTurnEventsApplication } from "./chat_turn_events";
import type {
  AgentOrchestrationEnvironment,
  AppContext,
} from "./context";

type AgentOrchestrationDependencies = {
  database: ApiGatewayDatabase;
  environment: AgentOrchestrationEnvironment;
  eventBus?: AppContext["eventBus"];
  toolExecutor?: AppContext["toolExecutor"];
};

export const createAgentOrchestrationApplication = (
  dependencies: AgentOrchestrationDependencies,
) => {
  const ctx: AppContext = {
    database: dependencies.database,
    environment: dependencies.environment,
    eventBus: dependencies.eventBus ?? InMemoryEventBus(),
  };
  if (dependencies.toolExecutor !== undefined) {
    ctx.toolExecutor = dependencies.toolExecutor;
  }

  return {
    agent_chat: AgentChatApplication(ctx),
    chat_sessions: ChatSessionsApplication(ctx),
    chat_turn_blobs: ChatTurnBlobsApplication(ctx),
    chat_turn_events: ChatTurnEventsApplication(ctx),
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
