import type { getSecrets } from "../../config/secrets";
import {
  createBullMqConnection,
  createJobQueue,
  createJobWorker,
} from "../../infrastructure/jobs/queues";
import type { AppContext } from "../../server";
import { logger } from "../../infrastructure/logger";
import { deleteExpiredDeletedOrganizationsJob } from "./delete_expired_deleted_organizations";
import { downgradeExpiredPlusTrialsJob } from "./downgrade_expired_plus_trials";

export type CronJobFrequency = {
  pattern: string;
};

export type DomainCronJob<TInput = unknown> = {
  name: string;
  queue: string;
  frequency: CronJobFrequency;
  processor: (ctx: AppContext, input: unknown) => Promise<void>;
};

export const domainCronJobs = [
  downgradeExpiredPlusTrialsJob,
  deleteExpiredDeletedOrganizationsJob,
] satisfies DomainCronJob[];

type Secrets = Awaited<ReturnType<typeof getSecrets>>;

type DomainJobsRuntimeInput = {
  ctx: AppContext;
  secrets: Pick<Secrets, "REDIS_URL">;
};

export const startDomainJobs = async (input: DomainJobsRuntimeInput) => {
  const connection = createBullMqConnection(input.secrets);
  const jobsByQueue = new Map<string, DomainCronJob[]>();

  for (const job of domainCronJobs) {
    jobsByQueue.set(job.queue, [...(jobsByQueue.get(job.queue) ?? []), job]);
  }

  const queues = new Map(
    [...jobsByQueue.keys()].map((queueName) => [
      queueName,
      createJobQueue(queueName, connection),
    ]),
  );

  await Promise.all(
    domainCronJobs.map((job) =>
      queues.get(job.queue)!.add(
        job.name,
        {},
        {
          repeat: job.frequency,
          jobId: job.name,
        },
      ),
    ),
  );

  const workers = [...jobsByQueue.entries()].map(([queueName, cronJobs]) => {
    const jobByName = new Map(cronJobs.map((cronJob) => [cronJob.name, cronJob]));

    return createJobWorker(queueName, connection, async (job) => {
      const cronJob = jobByName.get(job.name);

      if (!cronJob) {
        throw new Error(`Unknown job: ${job.name}`);
      }

      await cronJob.processor(input.ctx, job.data);
    });
  });

  for (const worker of workers) {
    worker.on("failed", (job, error) => {
      logger.error({ err: error, job_name: job?.name ?? "unknown" }, "Job failed");
    });

    worker.on("error", (error) => {
      logger.error({ err: error }, "Domain job worker error");
    });
  }

  return {
    async destroy() {
      await Promise.all(workers.map((worker) => worker.close()));
      await Promise.all([...queues.values()].map((queue) => queue.close()));
    },
  };
};
