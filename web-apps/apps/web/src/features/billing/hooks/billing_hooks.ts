import { useMutation } from "@tanstack/react-query";
import { createLemonSqueezyCheckout, createRazorpayOrder, PurchaseType } from "../api/billing_api";

export const useCreateLemonSqueezyCheckout = () => {
  return useMutation({
    mutationFn: ({ organizationId, type }: { organizationId: string; type: PurchaseType }) =>
      createLemonSqueezyCheckout(organizationId, type)
  });
};

export const useCreateRazorpayOrder = () => {
  return useMutation({
    mutationFn: ({ organizationId, type }: { organizationId: string; type: PurchaseType }) =>
      createRazorpayOrder(organizationId, type)
  });
};
