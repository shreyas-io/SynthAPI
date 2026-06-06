import { Queue, Worker, type ConnectionOptions } from "bullmq";

import type { getSecrets } from "../../config/secrets";

type Secrets = Awaited<ReturnType<typeof getSecrets>>;

export const createBullMqConnection = (
  secrets: Pick<Secrets, "REDIS_HOST" | "REDIS_PORT" | "REDIS_PASSWORD">,
): ConnectionOptions => ({
  host: secrets.REDIS_HOST,
  port: secrets.REDIS_PORT,
  password: secrets.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});

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
