import type {
  DurableObjectNamespace,
  Hyperdrive,
  KVNamespace,
  Queue,
} from "@cloudflare/workers-types";

import type { AppContext } from "./context";
import { createSecretsProvider } from "./config/secrets";
import { createDatabaseClientFromConnectionString } from "./infrastructure/kysely";
import { createKeyValueStore } from "./infrastructure/kv";
import { InMemoryEventBus } from "./infrastructure/agent_orchestration/event_bus";
import { MailerSendEmailService } from "./infrastructure/email/mailersend_email_service";
import { createWorkerMockApiRequestLogger } from "./infrastructure/request_logs/worker_logger";
import { ExaWebSearchProvider } from "./infrastructure/agent_orchestration/exa_web_search";
import { CloudflareTokenRateLimiter } from "./infrastructure/rate_limiter/cloudflare_token_bucket";
import { createLambdaPythonCodeRunner } from "./infrastructure/python_code_runner/lambda";

export interface Env {
  KV: KVNamespace;
  REQUEST_LOGS_QUEUE: Queue;
  RATE_LIMITER_DO: DurableObjectNamespace;
  HYPERDRIVE?: Hyperdrive;
  SENTRY_DSN?: string;
}

const envToStringRecord = (
  env: Env,
): Record<string, string | undefined> => {
  const record: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === "string") {
      record[key] = value;
    }
  }
  return record;
};

let workerContextPromise: Promise<AppContext> | null = null;

export const createWorkerAppContext = (env: Env): Promise<AppContext> => {
  const isLocalDev = (envToStringRecord(env).ENV ?? "local") !== "production";

  if (isLocalDev) {
    return buildWorkerAppContext(env);
  }

  if (!workerContextPromise) {
    workerContextPromise = buildWorkerAppContext(env);
  }
  return workerContextPromise;
};

export const resetWorkerAppContext = () => {
  workerContextPromise = null;
};

const buildWorkerAppContext = async (env: Env): Promise<AppContext> => {
  const envRecord = envToStringRecord(env);
  const secrets = await createSecretsProvider(envRecord).getSecrets();

  // Connect through the Hyperdrive binding. In local dev wrangler dev provides
  // a Hyperdrive proxy backed by the localConnectionString (the Postgres
  // container); in production Hyperdrive pools/caches the RDS connection.
  const connectionString =
    secrets.ENV !== "production"
      ? `postgresql://${secrets.DB_USER}:${secrets.DB_PASS}@${secrets.DB_HOST}:${secrets.DB_PORT}/${secrets.DB_NAME}`
      : env.HYPERDRIVE?.connectionString ?? envRecord.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "No database connection string available in worker environment. " +
        "Set up the HYPERDRIVE binding or DATABASE_URL secret.",
    );
  }

  const isLocalDev = secrets.ENV !== "production";
  const dbClient = createDatabaseClientFromConnectionString(
    connectionString,
    isLocalDev
      ? {
          max: 10,
          connectionTimeoutMillis: 10_000,
          idleTimeoutMillis: 1, // Close connections immediately to avoid workerd socket corruption
        }
      : undefined,
  );
  const kvStore = createKeyValueStore(env);
  const pythonCodeRunner = createLambdaPythonCodeRunner({
    functionName: secrets.PYTHON_RUNNER_LAMBDA_FUNCTION_NAME,
    region: secrets.AWS_REGION,
    accessKeyId: secrets.AWS_ACCESS_KEY_ID,
    secretAccessKey: secrets.AWS_SECRET_ACCESS_KEY,
    endpoint: secrets.PYTHON_RUNNER_LAMBDA_ENDPOINT,
    timeoutMs: secrets.PYTHON_RUNNER_LAMBDA_TIMEOUT_MS,
  });
  const eventBus = InMemoryEventBus();
  const emailService = new MailerSendEmailService({
    apiKey: secrets.MAILERSEND_API_KEY,
    ...(secrets.MAILERSEND_BASE_URL
      ? { baseUrl: secrets.MAILERSEND_BASE_URL }
      : undefined),
    from: secrets.EMAIL_FROM,
    ...(secrets.EMAIL_REPLY_TO
      ? { replyTo: secrets.EMAIL_REPLY_TO }
      : undefined),
  });
  const mockApiRequestLogger = createWorkerMockApiRequestLogger(dbClient.db);
  const webSearchProvider = new ExaWebSearchProvider(secrets.EXA_API_KEY);
  const rateLimiter = new CloudflareTokenRateLimiter(env.RATE_LIMITER_DO, {
    bucketSize: 100,
    refillRate: 10,
  });

  return {
    db: dbClient.db,
    dbClient,
    kvStore,
    pythonCodeRunner,
    env: secrets,
    eventBus,
    emailService,
    mockApiRequestLogger,
    webSearchProvider,
    rateLimiter,
  };
};
