import type { DomainCronJob } from ".";
import { logger } from "../../infrastructure/logger";
import { deleteExpiredDeletedOrganizations } from "../usecases/organizations";

export const deleteExpiredDeletedOrganizationsJob = {
  name: "delete-expired-deleted-organizations",
  queue: "organization-maintenance",
  frequency: {
    pattern: "0 * * * *",
  },
  async processor(ctx, _input) {
    const deleted = await deleteExpiredDeletedOrganizations(ctx);
    logger.info({ deleted }, "Deleted expired deleted organizations");
  },
} satisfies DomainCronJob;
