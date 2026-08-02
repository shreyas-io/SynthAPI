import type { Secrets } from "./config/secrets";
import type { IEventBus } from "./domain/interfaces/agent_orchestration/event_bus";
import type { IWebSearchProvider } from "./domain/interfaces/agent_orchestration/web_search";
import type { IEmailService } from "./domain/interfaces/email_service";
import type { ITokenBucketRateLimiter } from "./domain/interfaces/rate_limiter";
import type { IKeyValueStore } from "./domain/interfaces/kv_store";
import type { IMockApiRequestLogger } from "./infrastructure/request_logs";
import type { ApiGatewayDatabase } from "./infrastructure/kysely";
import type { IPythonCodeRunner } from "./domain/interfaces/python_code_runner";

export type AppContext = {
  db: ApiGatewayDatabase["db"];
  dbClient: ApiGatewayDatabase;
  kvStore: IKeyValueStore;
  pythonCodeRunner: IPythonCodeRunner;
  env: Secrets;
  eventBus: IEventBus;
  emailService: IEmailService;
  mockApiRequestLogger: IMockApiRequestLogger;
  webSearchProvider: IWebSearchProvider;
  rateLimiter: ITokenBucketRateLimiter;
};
