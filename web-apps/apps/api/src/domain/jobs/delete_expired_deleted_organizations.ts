import type { DomainCronJob } from ".";
import { deleteExpiredDeletedOrganizations } from "../usecases/organizations";

export const deleteExpiredDeletedOrganizationsJob = {
  name: "delete-expired-deleted-organizations",
  queue: "organization-maintenance",
  frequency: {
    pattern: "0 * * * *",
  },
  async processor(ctx, _input) {
    const deleted = await deleteExpiredDeletedOrganizations(ctx);
    console.log(`Deleted ${deleted} expired deleted organizations.`);
  },
} satisfies DomainCronJob;
