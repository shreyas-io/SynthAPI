import type { Kysely, Transaction } from "kysely";

import type { Database } from "../../../infrastructure/kysely/models";

type DatabaseExecutor = Kysely<Database> | Transaction<Database>;

export type PlanAiPricing = {
  credits_per_usd: number;
  min_credit_charge: number;
  web_search_cost_usd: number;
};

/**
 * Resolves the plan-level AI economics for an organization from its active
 * plan subscription, falling back to the basic plan's pricing when no active
 * subscription exists (organizations are normally always covered).
 * Token prices live with the model definitions in AgentConfig, not here.
 */
export const getPlanAiPricingForOrganization = async (
  db: DatabaseExecutor,
  organization_id: string,
): Promise<PlanAiPricing> => {
  const activePricing = await db
    .selectFrom("plan_ai_usage_prices")
    .innerJoin(
      "organization_plan_subscriptions",
      "organization_plan_subscriptions.plan_type_id",
      "plan_ai_usage_prices.plan_type_id",
    )
    .select([
      "plan_ai_usage_prices.credits_per_usd as credits_per_usd",
      "plan_ai_usage_prices.min_credit_charge as min_credit_charge",
      "plan_ai_usage_prices.web_search_cost_usd as web_search_cost_usd",
    ])
    .where(
      "organization_plan_subscriptions.organization_id",
      "=",
      organization_id,
    )
    .where("organization_plan_subscriptions.status", "=", "active")
    .executeTakeFirst();

  if (activePricing) return activePricing;

  const basicPricing = await db
    .selectFrom("plan_ai_usage_prices")
    .innerJoin("plan_types", "plan_types.id", "plan_ai_usage_prices.plan_type_id")
    .select([
      "plan_ai_usage_prices.credits_per_usd as credits_per_usd",
      "plan_ai_usage_prices.min_credit_charge as min_credit_charge",
      "plan_ai_usage_prices.web_search_cost_usd as web_search_cost_usd",
    ])
    .where("plan_types.key", "=", "basic")
    .executeTakeFirst();

  if (!basicPricing) {
    throw new Error("Plan AI pricing is not configured.");
  }

  return basicPricing;
};
