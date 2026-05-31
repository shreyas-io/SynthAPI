import type { IEventBus } from "../../domain/interfaces/agent_orchestration/event_bus";
import type { IToolExecutor } from "../../domain/interfaces/agent_orchestration/tool_executor";
import type { ApiGatewayDatabase } from "../../infrastructure/kysely";

export type AgentOrchestrationEnvironment = {
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_AI_GATEWAY_ID: string;
  CLOUDFLARE_AI_GATEWAY_TOKEN: string;
  OPENROUTER_API_KEY: string;
  OLLAMA_BASE_URL?: string | undefined;
};

export type AppContext = {
  database: ApiGatewayDatabase;
  environment: AgentOrchestrationEnvironment;
  eventBus: IEventBus;
  toolExecutor?: IToolExecutor | undefined;
};
