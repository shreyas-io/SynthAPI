import type { AppContext } from "../../../server";
import { HttpStatusCode, MockApiException } from "../../exceptions/exception";
import { createOrganizationPlanSubscription } from "../organizations/plans";
import crypto from "crypto";

export type PurchaseType = "plus_1m" | "plus_3m" | "plus_6m" | "plus_12m" | "credits_500" | "credits_2000" | "credits_5000";

const PURCHASE_AMOUNTS: Record<PurchaseType, number> = {
  plus_1m: 999, // $9.99
  plus_3m: 2249, // $22.49 ($7.49/mo)
  plus_6m: 3999, // $39.99 ($6.66/mo)
  plus_12m: 5999, // $59.99 ($4.99/mo)
  credits_5000: 499, // $4.99
  credits_2000: 199, // $1.99
  credits_500: 99, // $0.99
};

const CREDIT_GRANTS: Record<Exclude<PurchaseType, "plus_1m" | "plus_3m" | "plus_6m" | "plus_12m">, number> = {
  credits_5000: 10000,
  credits_2000: 4000,
  credits_500: 1000,
};

const PLUS_PLAN_CONFIG: Record<string, { days: number, credits: number, credit_days: number }> = {
  plus_1m: { days: 30, credits: 10000, credit_days: 60 },
  plus_3m: { days: 90, credits: 30000, credit_days: 180 },
  plus_6m: { days: 180, credits: 60000, credit_days: 360 },
  plus_12m: { days: 365, credits: 120000, credit_days: 730 },
};

export const BillingUsecase = (ctx: AppContext) => {
  const RZP_KEY = process.env.RZP_KEY || "";
  const RZP_SECRET = process.env.RZP_SECRET || "";
  const RZP_WEBHOOK_SECRET = process.env.RZP_WEBHOOK_SECRET || "";
  const LS_KEY = process.env.LEMON_SQUEEZY_API_KEY || "";
  const LS_STORE_ID = process.env.LEMON_SQUEEZY_STORE_ID || "";
  const LS_WEBHOOK_SECRET = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || "";

  return {
    createRazorpayOrder: async (organizationId: string, type: PurchaseType) => {
      const amount = PURCHASE_AMOUNTS[type];

      const auth = Buffer.from(`${RZP_KEY}:${RZP_SECRET}`).toString("base64");
      
      try {
        const response = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Basic ${auth}`
          },
          body: JSON.stringify({
            amount,
            currency: "USD",
            notes: {
              organization_id: organizationId,
              purchase_type: type
            }
          })
        });

        if (!response.ok) {
          const errBody = await response.text();
          console.error("Razorpay order creation failed:", response.status, errBody);
          throw new Error(`Razorpay API Error: ${errBody}`);
        }

        const data: any = await response.json();
        return { order_id: data.id, amount, currency: "USD", key: RZP_KEY };
      } catch (err: any) {
        throw new MockApiException({
          public_message: err.message || "Failed to initialize Razorpay checkout",
          status_code: HttpStatusCode.INTERNAL_SERVER_ERROR
        });
      }
    },

    handleRazorpayWebhook: async (signature: string, payload: any, rawBody: string) => {
      const expectedSignature = crypto.createHmac("sha256", RZP_WEBHOOK_SECRET).update(rawBody).digest("hex");
      if (expectedSignature !== signature) {
        throw new MockApiException({
          public_message: "Invalid Razorpay signature",
          status_code: HttpStatusCode.FORBIDDEN
        });
      }

      if (payload.event === "payment.captured") {
        const payment = payload.payload.payment.entity;
        const orgId = payment.notes?.organization_id;
        const type = payment.notes?.purchase_type as PurchaseType;

        if (orgId && type) {
          await ctx.db.transaction().execute(async (trx) => {
            if (PLUS_PLAN_CONFIG[type]) {
              const config = PLUS_PLAN_CONFIG[type];
              await createOrganizationPlanSubscription(trx, {
                organization_id: orgId,
                plan_key: "plus",
                duration_days: config.days,
                credit_amount: config.credits,
                credit_duration_days: config.credit_days,
              });
            } else if (CREDIT_GRANTS[type as keyof typeof CREDIT_GRANTS]) {
              const expiresAt = new Date();
              expiresAt.setFullYear(expiresAt.getFullYear() + 1);

              await trx
                .insertInto("organization_credit_grants")
                .values({
                  organization_id: orgId,
                  grant_type: "ai_credits",
                  amount: CREDIT_GRANTS[type as keyof typeof CREDIT_GRANTS],
                  source_subscription_id: `rzp_payment_${payment.id}`,
                  expires_at: expiresAt,
                })
                .execute();
            }
          });
        }
      }
    },

    createLemonSqueezyCheckout: async (organizationId: string, type: PurchaseType) => {
      let variantId = "";
      if (type === "plus_1m") variantId = process.env.LS_VARIANT_PLUS_1M || "1001";
      if (type === "plus_3m") variantId = process.env.LS_VARIANT_PLUS_3M || "1005";
      if (type === "plus_6m") variantId = process.env.LS_VARIANT_PLUS_6M || "1006";
      if (type === "plus_12m") variantId = process.env.LS_VARIANT_PLUS_12M || "1007";
      if (type === "credits_5000") variantId = process.env.LS_VARIANT_5000 || "1002";
      if (type === "credits_2000") variantId = process.env.LS_VARIANT_2000 || "1003";
      if (type === "credits_500") variantId = process.env.LS_VARIANT_500 || "1004";

      try {
        const response = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
          method: "POST",
          headers: {
            "Accept": "application/vnd.api+json",
            "Content-Type": "application/vnd.api+json",
            "Authorization": `Bearer ${LS_KEY}`
          },
          body: JSON.stringify({
            data: {
              type: "checkouts",
              attributes: {
                checkout_data: {
                  custom: {
                    organization_id: organizationId,
                    purchase_type: type
                  }
                }
              },
              relationships: {
                store: { data: { type: "stores", id: LS_STORE_ID } },
                variant: { data: { type: "variants", id: variantId } }
              }
            }
          })
        });

        if (!response.ok) {
          const errBody = await response.text();
          console.error("Lemon Squeezy checkout failed:", response.status, errBody);
          throw new Error(`Lemon Squeezy API Error: ${errBody}`);
        }

        const data: any = await response.json();
        return { checkout_url: data.data.attributes.url };
      } catch (err: any) {
        throw new MockApiException({
          public_message: err.message || "Failed to initialize Lemon Squeezy checkout",
          status_code: HttpStatusCode.INTERNAL_SERVER_ERROR
        });
      }
    },

    handleLemonSqueezyWebhook: async (signature: string, payload: any, rawBody: string) => {
      const expectedSignature = crypto.createHmac("sha256", LS_WEBHOOK_SECRET).update(rawBody).digest("hex");
      if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))) {
        throw new MockApiException({
          public_message: "Invalid Lemon Squeezy signature",
          status_code: HttpStatusCode.FORBIDDEN
        });
      }

      if (payload.meta.event_name === "order_created" || payload.meta.event_name === "subscription_created") {
        const customData = payload.meta.custom_data || {};
        const orgId = customData.organization_id;
        const type = customData.purchase_type as PurchaseType;

        if (orgId && type) {
          await ctx.db.transaction().execute(async (trx) => {
            if (PLUS_PLAN_CONFIG[type]) {
              const config = PLUS_PLAN_CONFIG[type];
              await createOrganizationPlanSubscription(trx, {
                organization_id: orgId,
                plan_key: "plus",
                duration_days: config.days,
                credit_amount: config.credits,
                credit_duration_days: config.credit_days,
              });
            } else if (CREDIT_GRANTS[type as keyof typeof CREDIT_GRANTS]) {
              const expiresAt = new Date();
              expiresAt.setFullYear(expiresAt.getFullYear() + 1);

              await trx
                .insertInto("organization_credit_grants")
                .values({
                  organization_id: orgId,
                  grant_type: "ai_credits",
                  amount: CREDIT_GRANTS[type as keyof typeof CREDIT_GRANTS],
                  source_subscription_id: `ls_order_${payload.data.id}`,
                  expires_at: expiresAt,
                })
                .execute();
            }
          });
        }
      }
    }
  };
};
