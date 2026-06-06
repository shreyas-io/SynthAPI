import type { DomainCronJob } from ".";
import { downgradeExpiredPlusTrials } from "../usecases/organizations/plans";

export const downgradeExpiredPlusTrialsJob = {
  name: "downgrade-expired-plus-trials",
  queue: "organization-maintenance",
  frequency: {
    pattern: "0 * * * *",
  },
  async processor(ctx, _input) {
    const downgraded = await downgradeExpiredPlusTrials(ctx.db);
    console.log(`Downgraded ${downgraded} expired Plus trial organizations.`);
  },
} satisfies DomainCronJob;
