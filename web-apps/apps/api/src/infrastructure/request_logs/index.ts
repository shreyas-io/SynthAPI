import { Queue, Worker, type ConnectionOptions } from "bullmq";
import type { Database } from "../kysely/models";
import type { Kysely } from "kysely";
import { getActiveOrganizationPlan } from "../../domain/usecases/organizations/plans";

const BULLMQ_KEY_PREFIX = "{synthapi_request_logs}";

type MockApiRequestLogInput = {
  project_id: string;
  mock_api_id: string | null;
  method: string;
  url: string;
  request_headers: Record<string, any>;
  request_body: string | null;
  response_status: number;
  response_headers: Record<string, any>;
  response_body: string | null;
};

export interface IMockApiRequestLogger {
  logRequest(input: MockApiRequestLogInput): Promise<void>;
  destroy(): Promise<void>;
}

export const createMockApiRequestLogger = (
  redisUrlStr: string,
  db: Kysely<Database>,
): IMockApiRequestLogger => {
  const redisUrl = new URL(redisUrlStr);
  const username = decodeURIComponent(redisUrl.username);
  const password = decodeURIComponent(redisUrl.password);
  const redisDb = redisUrl.pathname.replace(/^\//, "");

  const connection: ConnectionOptions = {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    ...(username ? { username } : undefined),
    ...(password ? { password } : undefined),
    ...(redisDb ? { db: Number(redisDb) } : undefined),
    ...(redisUrl.protocol === "rediss:" ? { tls: {} } : undefined),
    maxRetriesPerRequest: null,
  };

  const queue = new Queue<MockApiRequestLogInput>("mock_api_request_logs", {
    connection,
    prefix: BULLMQ_KEY_PREFIX,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: 100,
      removeOnFail: 100,
    },
  });

  const worker = new Worker<MockApiRequestLogInput>(
    "mock_api_request_logs",
    async (job) => {
      const data = job.data;

      // 1. Insert the new log
      await db
        .insertInto("mock_api_request_logs")
        .values({
          project_id: data.project_id,
          mock_api_id: data.mock_api_id,
          method: data.method,
          url: data.url,
          request_headers: JSON.stringify(data.request_headers),
          request_body: data.request_body,
          response_status: data.response_status,
          response_headers: JSON.stringify(data.response_headers),
          response_body: data.response_body,
        })
        .execute();

      // 2. Perform efficient cleanup
      // To prevent cleanup on every request, we can sample the cleanup based on probability (e.g. 5%)
      // This is efficient and eventually keeps the count near the limit.
      if (Math.random() < 0.05) {
        const project = await db
          .selectFrom("projects")
          .select("organization_id")
          .where("id", "=", data.project_id)
          .executeTakeFirst();

        if (project) {
          const plan = await getActiveOrganizationPlan(
            db,
            project.organization_id,
          );
          const maxLogs = plan?.max_request_logs ?? 1000;

          // Delete logs beyond the max_logs limit using an efficient offset query
          await db.executeQuery(
            db
              .deleteFrom("mock_api_request_logs")
              .where(
                "id",
                "in",
                db
                  .selectFrom("mock_api_request_logs")
                  .select("id")
                  .where("project_id", "=", data.project_id)
                  .orderBy("created_at", "desc")
                  .offset(maxLogs),
              )
              .compile(),
          );
        }
      }
    },
    {
      connection,
      prefix: BULLMQ_KEY_PREFIX,
      concurrency: 10, // Allow multiple workers to process logs concurrently
    },
  );

  worker.on("failed", (job, error) => {
    console.error(`Request logger job failed for ${job?.id}:`, error);
  });

  worker.on("error", (error) => {
    console.error("Request logger worker error:", error);
  });

  return {
    async logRequest(input: MockApiRequestLogInput) {
      await queue.add("log_request", input);
    },
    async destroy() {
      await worker.close();
      await queue.close();
    },
  };
};
