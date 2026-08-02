import { Hono } from "hono";
import type { Context } from "hono";
import { z } from "zod";

import type { AppContext } from "../context";
import { BillingUsecase } from "../domain/usecases/billing";
import { HttpStatusCode, MockApiException } from "../domain/exceptions/exception";
import { OrganizationsUsecase } from "../domain/usecases/organizations";

const PurchaseRequestSchema = z.object({
  organization_id: z.string().uuid(),
  type: z.enum(["plus_1m", "plus_3m", "plus_6m", "plus_12m", "credits_500", "credits_2000", "credits_5000"])
});

export const addBillingWebhookRoutes = (app: Hono, ctx: AppContext) => {
  const router = new Hono();
  const billingUsecase = BillingUsecase(ctx);

  router.post("/razorpay/webhook", async (c) => {
    const signature = c.req.header("x-razorpay-signature");
    if (!signature) {
      throw new MockApiException({
        public_message: "Missing signature",
        status_code: HttpStatusCode.BAD_REQUEST
      });
    }

    const rawBody = c.var.rawBody ?? JSON.stringify(c.get("body"));
    await billingUsecase.handleRazorpayWebhook(signature, c.get("body"), rawBody);
    return c.json({ success: true }, 200);
  });

  router.post("/lemonsqueezy/webhook", async (c) => {
    const signature = c.req.header("x-signature");
    if (!signature) {
      throw new MockApiException({
        public_message: "Missing signature",
        status_code: HttpStatusCode.BAD_REQUEST
      });
    }

    const rawBody = c.var.rawBody ?? JSON.stringify(c.get("body"));
    await billingUsecase.handleLemonSqueezyWebhook(signature, c.get("body"), rawBody);
    return c.json({ success: true }, 200);
  });

  // Webhooks do not require bearer auth
  app.route("/api/webhooks/billing", router);
};

export const addBillingRoutes = (app: Hono, ctx: AppContext) => {
  const router = new Hono();
  const billingUsecase = BillingUsecase(ctx);
  const organizationsUsecase = OrganizationsUsecase(ctx);

  const authorizeBilling = async (c: Context, organizationId: string) => {
    const membership = await organizationsUsecase.getMembership(c.var.user!, organizationId);
    if (membership.role !== "owner") {
      throw new MockApiException({
        public_message: "Only organization owners can manage billing.",
        status_code: HttpStatusCode.FORBIDDEN,
      });
    }
  };

  router.post("/razorpay/order", async (c) => {
    const parsed = PurchaseRequestSchema.parse(c.get("body"));
    await authorizeBilling(c, parsed.organization_id);
    const order = await billingUsecase.createRazorpayOrder(
      parsed.organization_id,
      parsed.type
    );
    return c.json(order, 200);
  });

  router.post("/lemonsqueezy/checkout", async (c) => {
    const parsed = PurchaseRequestSchema.parse(c.get("body"));
    await authorizeBilling(c, parsed.organization_id);
    const checkout = await billingUsecase.createLemonSqueezyCheckout(
      parsed.organization_id,
      parsed.type
    );
    return c.json(checkout, 200);
  });

  // Note: /api/v1 is already authenticated by bearerAuthMiddleware in index.ts
  app.route("/api/v1/billing", router);
};
