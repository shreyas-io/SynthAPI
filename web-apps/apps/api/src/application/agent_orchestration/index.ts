import type { ApiGatewayDatabase } from "../../infrastructure/kysely";
import { InMemoryEventBus } from "../../infrastructure/agent_orchestration/event_bus";
import type { IKeyValueStore } from "../../domain/interfaces/kv_store";
import type { PyodideWorkerPool } from "../../infrastructure/pyodide";
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
  keyValueStore: IKeyValueStore;
  pyodide: PyodideWorkerPool;
  environment: AgentOrchestrationEnvironment;
  eventBus?: AppContext["eventBus"];
};

export const createAgentOrchestrationApplication = (
  dependencies: AgentOrchestrationDependencies,
) => {
  const ctx: AppContext = {
    database: dependencies.database,
    keyValueStore: dependencies.keyValueStore,
    pyodide: dependencies.pyodide,
    environment: dependencies.environment,
    eventBus: dependencies.eventBus ?? InMemoryEventBus(),
  };

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
