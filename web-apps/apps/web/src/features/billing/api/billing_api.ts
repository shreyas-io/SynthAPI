import { apiRequest } from "../../../lib/api/client";

export type PurchaseType = "plus_1m" | "plus_3m" | "plus_6m" | "plus_12m" | "credits_500" | "credits_2000" | "credits_5000";

export type CheckoutResponse = {
  checkout_url?: string;
  order_id?: string;
  amount?: number;
  currency?: string;
  key?: string;
};

export const createRazorpayOrder = async (organizationId: string, type: PurchaseType): Promise<CheckoutResponse> => {
  return apiRequest("/api/v1/billing/razorpay/order", {
    method: "POST",
    body: { organization_id: organizationId, type }
  });
};

export const createLemonSqueezyCheckout = async (organizationId: string, type: PurchaseType): Promise<CheckoutResponse> => {
  return apiRequest("/api/v1/billing/lemonsqueezy/checkout", {
    method: "POST",
    body: { organization_id: organizationId, type }
  });
};
