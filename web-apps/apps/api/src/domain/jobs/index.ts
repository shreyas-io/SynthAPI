import type { getSecrets } from "../../config/secrets";

export type CronJobFrequency = {
  pattern: string;
};

export type DomainCronJob<TInput = unknown> = {
  name: string;
  queue: string;
  frequency: CronJobFrequency;
  processor: (ctx: AppContext, input: TInput) => Promise<void>;
};

import type { AppContext } from "../../context";

import { deleteExpiredDeletedOrganizationsJob } from "./delete_expired_deleted_organizations";
import { downgradeExpiredPlusTrialsJob } from "./downgrade_expired_plus_trials";

export const domainCronJobs = [
  downgradeExpiredPlusTrialsJob,
  deleteExpiredDeletedOrganizationsJob,
] satisfies DomainCronJob[];

export type Secrets = Awaited<ReturnType<typeof getSecrets>>;
