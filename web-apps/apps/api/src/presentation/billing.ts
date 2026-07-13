import type { Express } from "express";
import { Router } from "express";
import { z } from "zod";

import type { AppContext } from "../server";
import { bearerAuthMiddleware } from "../middleware/auth";
import { BillingUsecase } from "../domain/usecases/billing";
import { HttpStatusCode, MockApiException } from "../domain/exceptions/exception";

const PurchaseRequestSchema = z.object({
  organization_id: z.string().uuid(),
  type: z.enum(["plus_1m", "plus_3m", "plus_6m", "plus_12m", "credits_500", "credits_2000", "credits_5000"])
});

export const addBillingWebhookRoutes = (app: Express, ctx: AppContext) => {
  const router = Router();
  const billingUsecase = BillingUsecase(ctx);

  router.post(
    "/razorpay/webhook",
    async (req, res, next) => {
      try {
        const signature = req.headers["x-razorpay-signature"];
        if (typeof signature !== "string") {
          throw new MockApiException({
            public_message: "Missing signature",
            status_code: HttpStatusCode.BAD_REQUEST
          });
        }
        
        const rawBody = (req as any).rawBody || JSON.stringify(req.body);
        await billingUsecase.handleRazorpayWebhook(signature, req.body, rawBody);
        res.status(200).json({ success: true });
      } catch (err) {
        next(err);
      }
    }
  );

  router.post(
    "/lemonsqueezy/webhook",
    async (req, res, next) => {
      try {
        const signature = req.headers["x-signature"];
        if (typeof signature !== "string") {
          throw new MockApiException({
            public_message: "Missing signature",
            status_code: HttpStatusCode.BAD_REQUEST
          });
        }
        
        const rawBody = (req as any).rawBody || JSON.stringify(req.body);
        await billingUsecase.handleLemonSqueezyWebhook(signature, req.body, rawBody);
        res.status(200).json({ success: true });
      } catch (err) {
        next(err);
      }
    }
  );

  // Webhooks do not require bearer auth
  app.use("/api/webhooks/billing", router);
};

import { OrganizationsUsecase } from "../domain/usecases/organizations";

export const addBillingRoutes = (app: Express, ctx: AppContext) => {
  const router = Router();
  const billingUsecase = BillingUsecase(ctx);
  const organizationsUsecase = OrganizationsUsecase(ctx);

  const authorizeBilling = async (req: any, organizationId: string) => {
    const membership = await organizationsUsecase.getMembership(req.user, organizationId);
    if (membership.role !== "owner") {
      throw new MockApiException({
        public_message: "Only organization owners can manage billing.",
        status_code: HttpStatusCode.FORBIDDEN,
      });
    }
  };

  router.post(
    "/razorpay/order",
    async (req: any, res, next) => {
      try {
        const parsed = PurchaseRequestSchema.parse(req.body);
        await authorizeBilling(req, parsed.organization_id);
        const order = await billingUsecase.createRazorpayOrder(
          parsed.organization_id,
          parsed.type
        );
        res.status(200).json(order);
      } catch (err) {
        next(err);
      }
    }
  );

  router.post(
    "/lemonsqueezy/checkout",
    async (req: any, res, next) => {
      try {
        const parsed = PurchaseRequestSchema.parse(req.body);
        await authorizeBilling(req, parsed.organization_id);
        const checkout = await billingUsecase.createLemonSqueezyCheckout(
          parsed.organization_id,
          parsed.type
        );
        res.status(200).json(checkout);
      } catch (err) {
        next(err);
      }
    }
  );

  // Note: /api/v1 is already authenticated by bearerAuthMiddleware in index.ts
  app.use("/api/v1/billing", router);
};
