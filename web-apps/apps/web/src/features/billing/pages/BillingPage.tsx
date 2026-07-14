import { useState } from "react";
import {
  Sparkles,
  Check,
  CreditCard,
  ShoppingBag,
  Loader2,
  Gift,
  Zap,
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
          theme: { color: "#3399cc" },
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
      <div className="billing-glow glow-purple"></div>
      <div className="billing-glow glow-pink"></div>

      <div className="billing-content">
        {/* Early Bird Banner */}
        <div className="early-bird-banner">
          <div className="banner-text">
            <h2>
              <Gift size={28} /> Early Bird Special!
            </h2>
            <p>
              Get up to 50% off on all Plus subscriptions. Valid for a limited time.
            </p>
          </div>
          <Sparkles size={48} opacity={0.8} />
        </div>

        <div style={{ textAlign: "center", marginBottom: "4rem" }}>
          <h1 style={{ fontSize: "3rem", fontWeight: "800", marginBottom: "1rem" }}>
            Supercharge your workflow
          </h1>
          <p style={{ fontSize: "1.2rem", color: "var(--color-text-muted)" }}>
            Choose the perfect plan for your API mocking needs. No hidden fees.
          </p>
        </div>

        <div style={{ display: "flex", gap: "2rem", flexDirection: "column" }}>
          {/* PLUS PLANS */}
          <div>
            <h2 style={{ fontSize: "1.8rem", fontWeight: "700", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Zap color="#8b5cf6" /> Plus Subscriptions
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "2rem" }}>
              {/* 1 Month */}
              <div className="funky-card">
                <div style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", fontWeight: "700", marginBottom: "0.5rem" }}>1 MONTH</div>
                <h3 style={{ fontSize: "2.5rem", margin: "0 0 0.5rem 0" }}>$9.99</h3>
                <div style={{ fontSize: "0.9rem", color: "var(--color-text-muted)" }}>Standard access</div>
                
                <ul className="funky-features">
                  <li><Check size={18} /> <span><b>10k</b> Credits</span></li>
                  <li><Check size={18} /> <span>30 days access</span></li>
                  <li><Check size={18} /> <span>10 Team Members</span></li>
                  <li><Check size={18} /> <span>100 Projects</span></li>
                </ul>

                <button
                  className="funky-btn funky-btn-secondary"
                  onClick={() => handlePurchase("plus_1m")}
                  disabled={isPending}
                >
                  {isPending ? <Loader2 className="spin" size={18} /> : <CreditCard size={18} />} Select Plan
                </button>
              </div>

              {/* 3 Months */}
              <div className="funky-card highlight">
                <div className="funky-badge">25% OFF</div>
                <div style={{ color: "var(--color-primary)", fontSize: "0.9rem", fontWeight: "700", marginBottom: "0.5rem" }}>3 MONTHS</div>
                <h3 style={{ fontSize: "2.5rem", margin: "0 0 0.5rem 0", color: "var(--color-primary)" }}>$22.49</h3>
                <div style={{ fontSize: "0.9rem", color: "var(--color-text-muted)" }}>($7.49 / mo)</div>
                
                <ul className="funky-features">
                  <li><Check size={18} /> <span><b>30k</b> Credits</span></li>
                  <li><Check size={18} /> <span>90 days access</span></li>
                  <li><Check size={18} /> <span>10 Team Members</span></li>
                  <li><Check size={18} /> <span>100 Projects</span></li>
                </ul>

                <button
                  className="funky-btn funky-btn-primary"
                  onClick={() => handlePurchase("plus_3m")}
                  disabled={isPending}
                >
                  {isPending ? <Loader2 className="spin" size={18} /> : <CreditCard size={18} />} Get 25% Off
                </button>
              </div>

              {/* 6 Months */}
              <div className="funky-card">
                <div style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", fontWeight: "700", marginBottom: "0.5rem" }}>6 MONTHS</div>
                <h3 style={{ fontSize: "2.5rem", margin: "0 0 0.5rem 0" }}>$39.99</h3>
                <div style={{ fontSize: "0.9rem", color: "var(--color-text-muted)" }}>($6.66 / mo)</div>
                
                <ul className="funky-features">
                  <li><Check size={18} /> <span><b>60k</b> Credits</span></li>
                  <li><Check size={18} /> <span>180 days access</span></li>
                  <li><Check size={18} /> <span>10 Team Members</span></li>
                  <li><Check size={18} /> <span>100 Projects</span></li>
                </ul>

                <button
                  className="funky-btn funky-btn-secondary"
                  onClick={() => handlePurchase("plus_6m")}
                  disabled={isPending}
                >
                  {isPending ? <Loader2 className="spin" size={18} /> : <CreditCard size={18} />} Select Plan
                </button>
              </div>

              {/* 12 Months */}
              <div className="funky-card highlight" style={{ borderColor: "rgba(236, 72, 153, 0.4)", background: "linear-gradient(180deg, rgba(236, 72, 153, 0.1) 0%, var(--color-surface) 100%)" }}>
                <div className="funky-badge" style={{ background: "#ec4899" }}>50% OFF</div>
                <div style={{ color: "#ec4899", fontSize: "0.9rem", fontWeight: "700", marginBottom: "0.5rem" }}>12 MONTHS</div>
                <h3 style={{ fontSize: "2.5rem", margin: "0 0 0.5rem 0", color: "#ec4899" }}>$59.99</h3>
                <div style={{ fontSize: "0.9rem", color: "var(--color-text-muted)" }}>($4.99 / mo)</div>
                
                <ul className="funky-features">
                  <li><Check size={18} /> <span><b>120k</b> Credits</span></li>
                  <li><Check size={18} /> <span>365 days access</span></li>
                  <li><Check size={18} /> <span>10 Team Members</span></li>
                  <li><Check size={18} /> <span>100 Projects</span></li>
                </ul>

                <button
                  className="funky-btn"
                  style={{ background: "linear-gradient(90deg, #ec4899, #f43f5e)", color: "white" }}
                  onClick={() => handlePurchase("plus_12m")}
                  disabled={isPending}
                >
                  {isPending ? <Loader2 className="spin" size={18} /> : <CreditCard size={18} />} Get 50% Off
                </button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "3rem", borderTop: "1px solid var(--color-border)", paddingTop: "3rem" }}>
            <h2 style={{ fontSize: "1.8rem", fontWeight: "700", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <ShoppingBag color="#3b82f6" /> Buy Credits On-Demand
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "2rem" }}>
              {/* $4.99 Pack */}
              <div className="funky-card">
                <div className="funky-badge" style={{ background: "#3b82f6" }}>BEST VALUE</div>
                <h3 style={{ fontSize: "1.8rem", margin: "1rem 0 0.5rem 0" }}>10,000 Credits</h3>
                <div style={{ fontSize: "1.2rem", color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>$4.99</div>
                <button
                  className="funky-btn funky-btn-secondary"
                  onClick={() => handlePurchase("credits_5000")}
                  disabled={isPending}
                >
                  {isPending ? <Loader2 className="spin" size={18} /> : <ShoppingBag size={18} />} Buy Credits
                </button>
              </div>

              {/* $1.99 Pack */}
              <div className="funky-card">
                <div className="funky-badge" style={{ background: "var(--color-text-muted)", color: "var(--color-bg)" }}>POPULAR</div>
                <h3 style={{ fontSize: "1.8rem", margin: "1rem 0 0.5rem 0" }}>4,000 Credits</h3>
                <div style={{ fontSize: "1.2rem", color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>$1.99</div>
                <button
                  className="funky-btn funky-btn-secondary"
                  onClick={() => handlePurchase("credits_2000")}
                  disabled={isPending}
                >
                  {isPending ? <Loader2 className="spin" size={18} /> : <ShoppingBag size={18} />} Buy Credits
                </button>
              </div>

              {/* $0.99 Pack */}
              <div className="funky-card">
                <h3 style={{ fontSize: "1.8rem", margin: "1rem 0 0.5rem 0" }}>1,000 Credits</h3>
                <div style={{ fontSize: "1.2rem", color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>$0.99</div>
                <button
                  className="funky-btn funky-btn-secondary"
                  onClick={() => handlePurchase("credits_500")}
                  disabled={isPending}
                >
                  {isPending ? <Loader2 className="spin" size={18} /> : <ShoppingBag size={18} />} Buy Credits
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {purchaseType && (
        <div className="funky-modal-overlay">
          <div className="funky-modal">
            <h2 style={{ marginBottom: "0.5rem", fontSize: "1.8rem", fontWeight: "800" }}>Checkout</h2>
            <p style={{ color: "var(--color-text-muted)", marginBottom: "2rem", fontSize: "1rem" }}>Select your preferred payment provider to complete the purchase.</p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Temporarily hidden 
              <button className="funky-btn funky-btn-secondary" onClick={() => executePurchase(purchaseType, "lemonsqueezy")} disabled={isPending}>
                {isPending && provider === "lemonsqueezy" ? <Loader2 className="spin" size={18} /> : null} Pay with Lemon Squeezy
              </button>
              */}
              <button className="funky-btn funky-btn-secondary" onClick={() => executePurchase(purchaseType, "razorpay")} disabled={isPending}>
                {isPending && provider === "razorpay" ? <Loader2 className="spin" size={18} /> : null} Pay with Razorpay
              </button>
            </div>
            
            <div style={{ marginTop: "2rem", textAlign: "center" }}>
              <button 
                onClick={() => setPurchaseType(null)} 
                style={{ background: "transparent", color: "var(--color-text-muted)", border: "none", cursor: "pointer", fontSize: "1rem", fontWeight: "600" }}
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
