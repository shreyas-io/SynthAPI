import type { DomainCronJob } from ".";
import { logger } from "../../infrastructure/logger";
import { processExpiredSubscriptions } from "../usecases/organizations/plans";

export const downgradeExpiredPlusTrialsJob = {
  name: "downgrade-expired-plus-trials",
  queue: "organization-maintenance",
  frequency: {
    pattern: "0 * * * *",
  },
  async processor(ctx, _input) {
    const downgraded = await processExpiredSubscriptions(ctx.db);
    logger.info({ downgraded }, "Processed expired organization subscriptions");
  },
} satisfies DomainCronJob;
