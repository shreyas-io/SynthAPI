import type { Kysely, Transaction } from "kysely";

import type { Database } from "../../../infrastructure/kysely/models";
import { HttpStatusCode, MockApiException } from "../../exceptions/exception";

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
  },
) => {
  const plan = await getPlanType(db, input.plan_key);
  const startsAt = input.starts_at ?? new Date();
  const expiresAt = addDays(startsAt, plan.credit_grant_duration_days);

  const subscription = await db
    .insertInto("organization_plan_subscriptions")
    .values({
      organization_id: input.organization_id,
      plan_type_id: plan.id,
      status: "active",
      starts_at: startsAt,
      expires_at: expiresAt,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  if (plan.default_ai_credits > 0) {
    await db
      .insertInto("organization_credit_grants")
      .values({
        organization_id: input.organization_id,
        grant_type: "ai_credits",
        amount: plan.default_ai_credits,
        source_subscription_id: subscription.id,
        expires_at: subscription.expires_at,
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

export const downgradeExpiredPlusTrials = async (
  db: Kysely<Database>,
): Promise<number> => {
  const now = new Date();
  const expiredSubscriptions = await db
    .selectFrom("organization_plan_subscriptions")
    .innerJoin(
      "plan_types",
      "plan_types.id",
      "organization_plan_subscriptions.plan_type_id",
    )
    .select([
      "organization_plan_subscriptions.id as subscription_id",
      "organization_plan_subscriptions.organization_id as organization_id",
    ])
    .where("organization_plan_subscriptions.status", "=", "active")
    .where("organization_plan_subscriptions.expires_at", "<=", now)
    .where("plan_types.key", "=", "plus")
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

      await createOrganizationPlanSubscription(trx, {
        organization_id: subscription.organization_id,
        plan_key: "basic",
        starts_at: now,
      });

      await trx
        .updateTable("organization_memberships")
        .set({
          status: "stale",
          stale_reason: PLAN_DOWNGRADE_STALE_REASON,
          staled_at: now,
        })
        .where("organization_id", "=", subscription.organization_id)
        .where("status", "=", "active")
        .where("role", "!=", "owner")
        .execute();
    });
  }

  return expiredSubscriptions.length;
};
