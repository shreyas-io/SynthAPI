import type { IEventBus } from "../../domain/interfaces/agent_orchestration/event_bus";
import type { IKeyValueStore } from "../../domain/interfaces/kv_store";
import type { ApiGatewayDatabase } from "../../infrastructure/kysely";
import type { PyodideWorkerPool } from "../../infrastructure/pyodide";

export type AgentOrchestrationEnvironment = {
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_AI_GATEWAY_ID: string;
  CLOUDFLARE_AI_GATEWAY_TOKEN: string;
  OPENROUTER_API_KEY: string;
  OLLAMA_BASE_URL?: string | undefined;
};

export type AppContext = {
  database: ApiGatewayDatabase;
  keyValueStore: IKeyValueStore;
  pyodide: PyodideWorkerPool;
  environment: AgentOrchestrationEnvironment;
  eventBus: IEventBus;
};
