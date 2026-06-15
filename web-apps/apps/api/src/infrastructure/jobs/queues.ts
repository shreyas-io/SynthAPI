import { Queue, Worker, type ConnectionOptions } from "bullmq";

import type { getSecrets } from "../../config/secrets";

type Secrets = Awaited<ReturnType<typeof getSecrets>>;

export const createBullMqConnection = (
  secrets: Pick<Secrets, "REDIS_URL">,
): ConnectionOptions => {
  const redisUrl = new URL(secrets.REDIS_URL);
  const username = decodeURIComponent(redisUrl.username);
  const password = decodeURIComponent(redisUrl.password);
  const db = redisUrl.pathname.replace(/^\//, "");

  return {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    ...(username ? { username } : undefined),
    ...(password ? { password } : undefined),
    ...(db ? { db: Number(db) } : undefined),
    ...(redisUrl.protocol === "rediss:" ? { tls: {} } : undefined),
    maxRetriesPerRequest: null,
  };
};

export const createJobQueue = (
  name: string,
  connection: ConnectionOptions,
) =>
  new Queue(name, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 30_000,
      },
      removeOnComplete: 100,
      removeOnFail: 100,
    },
  });

export const createJobWorker = (
  name: string,
  connection: ConnectionOptions,
  processor: ConstructorParameters<typeof Worker>[1],
) =>
  new Worker(name, processor, {
    connection,
    concurrency: 1,
  });
