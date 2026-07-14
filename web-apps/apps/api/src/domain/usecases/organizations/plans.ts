import type { Kysely, Transaction } from "kysely";

import type { Database } from "../../../infrastructure/kysely/models";
import { HttpStatusCode, MockApiException } from "../../exceptions/exception";
import type { PlanSubscriptionStatus } from "../../entities/organization";

type DatabaseExecutor = Kysely<Database> | Transaction<Database>;
type PlanKey = "basic" | "plus";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const PLAN_DOWNGRADE_STALE_REASON = "plan_downgrade";

const addDays = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * MS_PER_DAY);

const getPlanType = async (db: DatabaseExecutor, key: PlanKey) => {
  const plan = await db
    .selectFrom("plan_types")
    .selectAll()
    .where("key", "=", key)
    .executeTakeFirst();

  if (!plan) {
    throw new Error(`${key} plan type is missing.`);
  }

  return plan;
};

export const createOrganizationPlanSubscription = async (
  db: DatabaseExecutor,
  input: {
    organization_id: string;
    plan_key: PlanKey;
    starts_at?: Date;
    duration_days?: number;
    credit_amount?: number;
    credit_duration_days?: number;
  },
) => {
  const plan = await getPlanType(db, input.plan_key);

  const activeSub = await db
    .selectFrom("organization_plan_subscriptions")
    .selectAll()
    .where("organization_id", "=", input.organization_id)
    .where("status", "=", "active")
    .executeTakeFirst();

  let startsAt = input.starts_at ?? new Date();
  let baseDateForExpiration = new Date(startsAt.getTime());
  let targetStatus: PlanSubscriptionStatus = "active";

  if (activeSub && activeSub.plan_type_id === plan.id) {
    if (activeSub.expires_at > baseDateForExpiration) {
      baseDateForExpiration = new Date(activeSub.expires_at.getTime());
    }
    startsAt = activeSub.starts_at;
  } else if (activeSub && activeSub.plan_type_id !== plan.id) {
    // If it's a cross-tier upgrade, queue the new plan to start after the current one expires
    targetStatus = "queued";
    startsAt = activeSub.expires_at;
    baseDateForExpiration = activeSub.expires_at;
  }

  const duration = input.duration_days ?? plan.credit_grant_duration_days;
  const expiresAt = addDays(baseDateForExpiration, duration);

  if (targetStatus === "active") {
    await db
      .updateTable("organization_plan_subscriptions")
      .set({ status: "expired" })
      .where("organization_id", "=", input.organization_id)
      .where("status", "=", "active")
      .execute();
  }

  const subscription = await db
    .insertInto("organization_plan_subscriptions")
    .values({
      organization_id: input.organization_id,
      plan_type_id: plan.id,
      status: targetStatus,
      starts_at: startsAt,
      expires_at: expiresAt,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  const creditsToGrant = input.credit_amount ?? plan.default_ai_credits;

  if (creditsToGrant > 0) {
    const transactionDate = input.starts_at ?? new Date();
    const creditExpiresAt = input.credit_duration_days
      ? addDays(transactionDate, input.credit_duration_days)
      : subscription.expires_at;

    await db
      .insertInto("organization_credit_grants")
      .values({
        organization_id: input.organization_id,
        grant_type: "ai_credits",
        amount: creditsToGrant,
        source_subscription_id: subscription.id,
        expires_at: creditExpiresAt,
      })
      .executeTakeFirstOrThrow();
  }

  return subscription;
};

export const getActiveOrganizationPlan = async (
  db: DatabaseExecutor,
  organization_id: string,
) => {
  return db
    .selectFrom("organization_plan_subscriptions")
    .innerJoin(
      "plan_types",
      "plan_types.id",
      "organization_plan_subscriptions.plan_type_id",
    )
    .select([
      "organization_plan_subscriptions.id as subscription_id",
      "organization_plan_subscriptions.organization_id as organization_id",
      "organization_plan_subscriptions.expires_at as expires_at",
      "plan_types.key as plan_key",
      "plan_types.max_org_members as max_org_members",
      "plan_types.max_projects as max_projects",
      "plan_types.max_request_logs as max_request_logs",
      "plan_types.default_ai_credits as default_ai_credits",
      "plan_types.rate_limit_req_per_sec as rate_limit_req_per_sec",
    ])
    .where(
      "organization_plan_subscriptions.organization_id",
      "=",
      organization_id,
    )
    .where("organization_plan_subscriptions.status", "=", "active")
    .executeTakeFirst();
};

/**
 * Checks if an organisation has an active plan and
 * active members count is less than allowed threshold
 */
export const assertOrganizationCanAddMember = async (
  db: DatabaseExecutor,
  organization_id: string,
) => {
  const plan = await getActiveOrganizationPlan(db, organization_id);

  if (!plan) {
    throw new MockApiException({
      public_message: "Active organization plan is missing.",
      status_code: HttpStatusCode.FORBIDDEN,
    });
  }

  const activeMembers = await db
    .selectFrom("organization_memberships")
    .select((eb) => eb.fn.count<number>("id").as("count"))
    .where("organization_id", "=", organization_id)
    .where("status", "=", "active")
    .executeTakeFirstOrThrow();

  if (Number(activeMembers.count) >= plan.max_org_members) {
    throw new MockApiException({
      public_message: "Organization member limit reached.",
      status_code: HttpStatusCode.FORBIDDEN,
    });
  }
};

export const assertOrganizationHasAiCredits = async (
  db: DatabaseExecutor,
  organization_id: string,
) => {
  const balance = await getOrganizationAiCreditBalance(db, organization_id);

  if (balance.remaining <= 0) {
    throw new MockApiException({
      public_message: "No AI credits available for this organization.",
      status_code: HttpStatusCode.FORBIDDEN,
    });
  }
};

export const getOrganizationAiCreditBalance = async (
  db: DatabaseExecutor,
  organization_id: string,
) => {
  const grantedCredits = await db
    .selectFrom("organization_credit_grants")
    .select((eb) => eb.fn.sum<number>("amount").as("amount"))
    .where("organization_id", "=", organization_id)
    .where("grant_type", "=", "ai_credits")
    .where("expires_at", ">", new Date())
    .executeTakeFirstOrThrow();

  const usedCredits = await db
    .selectFrom("organization_credit_usages")
    .innerJoin(
      "organization_credit_grants",
      "organization_credit_grants.id",
      "organization_credit_usages.credit_grant_id",
    )
    .select((eb) =>
      eb.fn.sum<number>("organization_credit_usages.amount").as("amount"),
    )
    .where("organization_credit_grants.organization_id", "=", organization_id)
    .where("organization_credit_grants.grant_type", "=", "ai_credits")
    .where("organization_credit_grants.expires_at", ">", new Date())
    .executeTakeFirstOrThrow();

  const granted = Number(grantedCredits.amount ?? 0);
  const used = Number(usedCredits.amount ?? 0);

  return {
    granted,
    used,
    remaining: Math.round(Math.max(granted - used, 0) * 100) / 100,
  };
};

export const processExpiredSubscriptions = async (
  db: Kysely<Database>,
): Promise<number> => {
  const now = new Date();
  const expiredSubscriptions = await db
    .selectFrom("organization_plan_subscriptions")
    .select([
      "organization_plan_subscriptions.id as subscription_id",
      "organization_plan_subscriptions.organization_id as organization_id",
    ])
    .where("organization_plan_subscriptions.status", "=", "active")
    .where("organization_plan_subscriptions.expires_at", "<=", now)
    .execute();

  for (const subscription of expiredSubscriptions) {
    await db.transaction().execute(async (trx) => {
      const updated = await trx
        .updateTable("organization_plan_subscriptions")
        .set({ status: "expired" })
        .where("id", "=", subscription.subscription_id)
        .where("status", "=", "active")
        .executeTakeFirst();

      if (Number(updated.numUpdatedRows) === 0) {
        return;
      }

      const queuedSub = await trx
        .selectFrom("organization_plan_subscriptions")
        .selectAll()
        .where("organization_id", "=", subscription.organization_id)
        .where("status", "=", "queued")
        .orderBy("starts_at", "asc")
        .executeTakeFirst();

      let nextPlanTypeId: string;

      if (queuedSub) {
        await trx
          .updateTable("organization_plan_subscriptions")
          .set({ status: "active" })
          .where("id", "=", queuedSub.id)
          .execute();
        nextPlanTypeId = queuedSub.plan_type_id;
      } else {
        const basicPlan = await getPlanType(trx, "basic");
        nextPlanTypeId = basicPlan.id;
        await createOrganizationPlanSubscription(trx, {
          organization_id: subscription.organization_id,
          plan_key: "basic",
          starts_at: now,
        });
      }

      const nextPlan = await trx
        .selectFrom("plan_types")
        .selectAll()
        .where("id", "=", nextPlanTypeId)
        .executeTakeFirstOrThrow();

      // Fetch all active members except the owner (who is always retained)
      const nonOwnerMembers = await trx
        .selectFrom("organization_memberships")
        .select(["id"])
        .where("organization_id", "=", subscription.organization_id)
        .where("status", "=", "active")
        .where("role", "!=", "owner")
        .orderBy("created_at", "asc")
        .execute();

      // The total allowed active members minus 1 (for the owner)
      const allowedNonOwners = Math.max(0, nextPlan.max_org_members - 1);

      if (nonOwnerMembers.length > allowedNonOwners) {
        const membersToStale = nonOwnerMembers
          .slice(allowedNonOwners)
          .map((m) => m.id);

        await trx
          .updateTable("organization_memberships")
          .set({
            status: "stale",
            stale_reason: PLAN_DOWNGRADE_STALE_REASON,
            staled_at: now,
          })
          .where("id", "in", membersToStale)
          .execute();
      }
    });
  }

  return expiredSubscriptions.length;
};
