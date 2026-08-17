import { useState } from "react";
import {
  Check,
  Loader2,
} from "lucide-react";
import {
  useCreateLemonSqueezyCheckout,
  useCreateRazorpayOrder,
} from "../hooks/billing_hooks";
import { useSelectedOrganization } from "../../../app/context/OrganizationContext";
import type { PurchaseType } from "../api/billing_api";
import "./BillingPage.css";

export function BillingPage() {
  const { selectedOrganizationId } = useSelectedOrganization();
  const lsCheckout = useCreateLemonSqueezyCheckout();
  const rzpOrder = useCreateRazorpayOrder();
  const [provider, setProvider] = useState<"lemonsqueezy" | "razorpay">(
    "lemonsqueezy",
  );

  const [purchaseType, setPurchaseType] = useState<PurchaseType | null>(null);

  const isPending = lsCheckout.isPending || rzpOrder.isPending;

  const executePurchase = async (
    type: PurchaseType,
    selectedProvider: "lemonsqueezy" | "razorpay",
  ) => {
    if (!selectedOrganizationId) return;
    setProvider(selectedProvider);

    if (selectedProvider === "lemonsqueezy") {
      const res = await lsCheckout.mutateAsync({
        organizationId: selectedOrganizationId,
        type,
      });
      if (res.checkout_url) {
        window.location.href = res.checkout_url;
      }
    } else {
      const res = await rzpOrder.mutateAsync({
        organizationId: selectedOrganizationId,
        type,
      });
      if (res.order_id && (window as any).Razorpay) {
        const options = {
          key: res.key,
          amount: res.amount,
          currency: res.currency,
          name: "SynthAPI",
          description: type.startsWith("plus")
            ? "Plus Subscription"
            : "Credit Package",
          order_id: res.order_id,
          handler: function () {
            alert("Payment successful! Credits will be provisioned shortly.");
            setPurchaseType(null);
          },
          theme: { color: "#111111" },
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        alert("Razorpay is not loaded.");
      }
    }
  };

  const handlePurchase = (type: PurchaseType) => {
    setPurchaseType(type);
  };

  return (
    <div className="billing-container">
      <div className="pricing-content">
        <div className="pricing-header">
          <h2>Pricing</h2>
          <p>Choose the perfect plan for your API mocking needs. No hidden fees.</p>
        </div>

        <div className="pricing-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {/* Free Plan */}
          <div className="pricing-card">
            <div className="pricing-card-header">
              <h3>Free Plan</h3>
              <p className="pricing-card-subtitle">
                A lightweight way to get started. No cost, no card, no hassle.
              </p>
            </div>
            <div className="pricing-card-price">
              <span className="currency">$</span>
              <span className="amount">0</span>
              <span className="period">/month</span>
            </div>
            <div className="pricing-card-billing-info">
              Free forever
            </div>
            <div className="pricing-card-action">
              <button
                className="pricing-btn pricing-btn-secondary"
                disabled={true}
              >
                Current Plan
              </button>
            </div>
            <ul className="pricing-features">
              <li><Check size={18} /> 1k Credits</li>
              <li><Check size={18} /> 30 days access</li>
              <li><Check size={18} /> 1 Team Member</li>
              <li><Check size={18} /> 3 Projects</li>
            </ul>
          </div>

          {/* 12 Months */}
          <div className="pricing-card pricing-card-popular">
            <div className="pricing-badge">50% OFF</div>
            <div className="pricing-card-header">
              <h3>12 Months</h3>
              <p className="pricing-card-subtitle">
                The best value for long-term API mocking and scale.
              </p>
            </div>
            <div className="pricing-card-price">
              <span className="currency">$</span>
              <span className="amount">4.99</span>
              <span className="period">/month</span>
            </div>
            <div className="pricing-card-billing-info">
              Billed annually ($59.99)
            </div>
            <div className="pricing-card-action">
              <button
                className="pricing-btn pricing-btn-primary"
                onClick={() => handlePurchase("plus_12m")}
                disabled={isPending}
              >
                Get 50% Off
              </button>
            </div>
            <ul className="pricing-features">
              <li><Check size={18} /> <b>120k</b> Credits</li>
              <li><Check size={18} /> 365 days access</li>
              <li><Check size={18} /> 10 Team Members</li>
              <li><Check size={18} /> 100 Projects</li>
            </ul>
          </div>

          {/* 6 Months */}
          <div className="pricing-card">
            <div className="pricing-card-header">
              <h3>6 Months</h3>
              <p className="pricing-card-subtitle">
                Extended access for continuous development.
              </p>
            </div>
            <div className="pricing-card-price">
              <span className="currency">$</span>
              <span className="amount">6.66</span>
              <span className="period">/month</span>
            </div>
            <div className="pricing-card-billing-info">
              Billed semi-annually ($39.99)
            </div>
            <div className="pricing-card-action">
              <button
                className="pricing-btn pricing-btn-secondary"
                onClick={() => handlePurchase("plus_6m")}
                disabled={isPending}
              >
                Select Plan
              </button>
            </div>
            <ul className="pricing-features">
              <li><Check size={18} /> <b>60k</b> Credits</li>
              <li><Check size={18} /> 180 days access</li>
              <li><Check size={18} /> 10 Team Members</li>
              <li><Check size={18} /> 100 Projects</li>
            </ul>
          </div>

          {/* 3 Months */}
          <div className="pricing-card">
            <div className="pricing-badge">25% OFF</div>
            <div className="pricing-card-header">
              <h3>3 Months</h3>
              <p className="pricing-card-subtitle">
                Perfect for medium-length projects and growing teams.
              </p>
            </div>
            <div className="pricing-card-price">
              <span className="currency">$</span>
              <span className="amount">7.49</span>
              <span className="period">/month</span>
            </div>
            <div className="pricing-card-billing-info">
              Billed quarterly ($22.49)
            </div>
            <div className="pricing-card-action">
              <button
                className="pricing-btn pricing-btn-secondary"
                onClick={() => handlePurchase("plus_3m")}
                disabled={isPending}
              >
                Get 25% Off
              </button>
            </div>
            <ul className="pricing-features">
              <li><Check size={18} /> <b>30k</b> Credits</li>
              <li><Check size={18} /> 90 days access</li>
              <li><Check size={18} /> 10 Team Members</li>
              <li><Check size={18} /> 100 Projects</li>
            </ul>
          </div>

          {/* 1 Month */}
          <div className="pricing-card">
            <div className="pricing-card-header">
              <h3>1 Month</h3>
              <p className="pricing-card-subtitle">
                Standard access for short-term projects and testing.
              </p>
            </div>
            <div className="pricing-card-price">
              <span className="currency">$</span>
              <span className="amount">9.99</span>
              <span className="period">/month</span>
            </div>
            <div className="pricing-card-billing-info">
              Billed monthly
            </div>
            <div className="pricing-card-action">
              <button
                className="pricing-btn pricing-btn-secondary"
                onClick={() => handlePurchase("plus_1m")}
                disabled={isPending}
              >
                Select Plan
              </button>
            </div>
            <ul className="pricing-features">
              <li><Check size={18} /> <b>10k</b> Credits</li>
              <li><Check size={18} /> 30 days access</li>
              <li><Check size={18} /> 10 Team Members</li>
              <li><Check size={18} /> 100 Projects</li>
            </ul>
          </div>
        </div>

        <div className="pricing-header" style={{ marginTop: "6rem", marginBottom: "3rem" }}>
          <h3 style={{ fontSize: "1.8rem", fontWeight: "600" }}>Buy Credits On-Demand</h3>
        </div>

        <div className="pricing-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          {/* $0.99 Pack */}
          <div className="pricing-card">
            <div className="pricing-card-header">
              <h3>1,000 Credits</h3>
            </div>
            <div className="pricing-card-price">
              <span className="currency">$</span>
              <span className="amount">0.99</span>
            </div>
            <div className="pricing-card-action">
              <button
                className="pricing-btn pricing-btn-secondary"
                onClick={() => handlePurchase("credits_500")}
                disabled={isPending}
              >
                Buy Credits
              </button>
            </div>
          </div>

          {/* $1.99 Pack */}
          <div className="pricing-card">
            <div className="pricing-badge" style={{ backgroundColor: "var(--color-text-muted)" }}>Popular</div>
            <div className="pricing-card-header">
              <h3>4,000 Credits</h3>
            </div>
            <div className="pricing-card-price">
              <span className="currency">$</span>
              <span className="amount">1.99</span>
            </div>
            <div className="pricing-card-action">
              <button
                className="pricing-btn pricing-btn-secondary"
                onClick={() => handlePurchase("credits_2000")}
                disabled={isPending}
              >
                Buy Credits
              </button>
            </div>
          </div>

          {/* $4.99 Pack */}
          <div className="pricing-card pricing-card-popular">
            <div className="pricing-badge">Best Value</div>
            <div className="pricing-card-header">
              <h3>10,000 Credits</h3>
            </div>
            <div className="pricing-card-price">
              <span className="currency">$</span>
              <span className="amount">4.99</span>
            </div>
            <div className="pricing-card-action">
              <button
                className="pricing-btn pricing-btn-primary"
                onClick={() => handlePurchase("credits_5000")}
                disabled={isPending}
              >
                Buy Credits
              </button>
            </div>
          </div>
        </div>
      </div>

      {purchaseType && (
        <div className="pricing-modal-overlay">
          <div className="pricing-modal">
            <h2 style={{ marginBottom: "0.5rem", fontSize: "1.8rem", fontWeight: "600", letterSpacing: "-0.02em" }}>Checkout</h2>
            <p style={{ color: "var(--color-text-muted)", marginBottom: "2rem", fontSize: "1rem" }}>Select your preferred payment provider to complete the purchase.</p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <button className="pricing-btn pricing-btn-secondary" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem" }} onClick={() => executePurchase(purchaseType, "lemonsqueezy")} disabled={isPending}>
                {isPending && provider === "lemonsqueezy" ? <Loader2 className="spin" size={18} /> : null} Pay with Lemon Squeezy
              </button>
              <button className="pricing-btn pricing-btn-secondary" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem" }} onClick={() => executePurchase(purchaseType, "razorpay")} disabled={isPending}>
                {isPending && provider === "razorpay" ? <Loader2 className="spin" size={18} /> : null} Pay with Razorpay
              </button>
            </div>
            
            <div style={{ marginTop: "2rem", textAlign: "center" }}>
              <button 
                onClick={() => setPurchaseType(null)} 
                style={{ background: "transparent", color: "var(--color-text-muted)", border: "none", cursor: "pointer", fontSize: "0.875rem", fontWeight: "500", fontFamily: "inherit" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
