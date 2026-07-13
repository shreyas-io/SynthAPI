import { useState } from "react";
import {
  Sparkles,
  Check,
  CreditCard,
  ShoppingBag,
  Loader2,
} from "lucide-react";
import {
  useCreateLemonSqueezyCheckout,
  useCreateRazorpayOrder,
} from "../hooks/billing_hooks";
import { useSelectedOrganization } from "../../../app/context/OrganizationContext";
import type { PurchaseType } from "../api/billing_api";

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
          handler: function (response: any) {
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
    <div className="workspace-container">
      <div className="workspace-header" style={{ justifyContent: "center" }}>
        <h1 className="workspace-title">Billing & Upgrades</h1>
      </div>


      <div
        className="workspace-content"
        style={{
          padding: "2rem",
          maxWidth: "1600px",
          margin: "0 auto",
          display: "flex",
          gap: "3rem",
          alignItems: "flex-start",
        }}
      >
        {/* PLUS PLANS */}
        <div
          style={{
            flex: "2",
            background: "var(--color-surface)",
            padding: "2rem",
            borderRadius: "16px",
            border: "1px solid var(--color-border)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ marginBottom: "2rem" }}>
            <h2
              style={{
                fontSize: "1.8rem",
                marginBottom: "0.5rem",
                fontWeight: "600",
              }}
            >
              Plus Subscriptions
            </h2>
            <p style={{ color: "var(--color-text-muted)", fontSize: "1rem" }}>
              Prepaid passes. Supercharge your workflow with massive limits.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "1rem",
              flex: 1,
            }}
          >
            {/* 1 Month */}
            <div
              className="card"
              style={{
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                border: "1px solid var(--color-border)",
                borderRadius: "12px",
                background: "var(--color-bg)",
              }}
            >
              <div
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: "0.8rem",
                  fontWeight: "600",
                  marginBottom: "0.5rem",
                }}
              >
                1 MONTH
              </div>
              <h3 style={{ fontSize: "1.6rem", marginBottom: "0.2rem" }}>
                $9.99
              </h3>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "1rem 0 1.5rem 0",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                  fontSize: "0.85rem",
                  color: "var(--color-text-secondary)",
                }}
              >
                <li
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                  }}
                >
                  <Check
                    size={14}
                    color="var(--color-success)"
                    style={{ flexShrink: 0, marginTop: "2px" }}
                  />{" "}
                  <span>
                    <b>10k</b> Credits
                  </span>
                </li>
                <li
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                  }}
                >
                  <Check
                    size={14}
                    color="var(--color-success)"
                    style={{ flexShrink: 0, marginTop: "2px" }}
                  />{" "}
                  <span>30 days access</span>
                </li>
                <li
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                  }}
                >
                  <Check
                    size={14}
                    color="var(--color-success)"
                    style={{ flexShrink: 0, marginTop: "2px" }}
                  />{" "}
                  <span>10 Team Members</span>
                </li>
                <li
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                  }}
                >
                  <Check
                    size={14}
                    color="var(--color-success)"
                    style={{ flexShrink: 0, marginTop: "2px" }}
                  />{" "}
                  <span>100 Projects</span>
                </li>
              </ul>
              <button
                className="btn btn-secondary"
                style={{
                  marginTop: "auto",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "0.5rem",
                  width: "100%",
                  padding: "0.6rem",
                  fontSize: "0.9rem",
                }}
                onClick={() => handlePurchase("plus_1m")}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="spin" size={14} />
                ) : (
                  <CreditCard size={14} />
                )}{" "}
                Select Plan
              </button>
            </div>

            {/* 3 Months */}
            <div
              className="card"
              style={{
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                border: "1px solid var(--color-primary)",
                borderRadius: "12px",
                background: "var(--color-bg)",
                position: "relative",
                boxShadow: "0 8px 24px rgba(59, 130, 246, 0.1)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "-10px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "var(--color-primary)",
                  color: "white",
                  fontSize: "0.7rem",
                  fontWeight: "bold",
                  padding: "2px 8px",
                  borderRadius: "10px",
                  whiteSpace: "nowrap",
                }}
              >
                25% OFF
              </div>
              <div
                style={{
                  color: "var(--color-primary)",
                  fontSize: "0.8rem",
                  fontWeight: "700",
                  marginBottom: "0.5rem",
                }}
              >
                3 MONTHS
              </div>
              <h3 style={{ fontSize: "1.6rem", marginBottom: "0.2rem" }}>
                $22.49
              </h3>
              <div
                style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}
              >
                ($7.49 / mo)
              </div>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "1rem 0 1.5rem 0",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                  fontSize: "0.85rem",
                  color: "var(--color-text-secondary)",
                }}
              >
                <li
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                  }}
                >
                  <Check
                    size={14}
                    color="var(--color-success)"
                    style={{ flexShrink: 0, marginTop: "2px" }}
                  />{" "}
                  <span>
                    <b>30k</b> Credits
                  </span>
                </li>
                <li
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                  }}
                >
                  <Check
                    size={14}
                    color="var(--color-success)"
                    style={{ flexShrink: 0, marginTop: "2px" }}
                  />{" "}
                  <span>90 days access</span>
                </li>
                <li
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                  }}
                >
                  <Check
                    size={14}
                    color="var(--color-success)"
                    style={{ flexShrink: 0, marginTop: "2px" }}
                  />{" "}
                  <span>10 Team Members</span>
                </li>
                <li
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                  }}
                >
                  <Check
                    size={14}
                    color="var(--color-success)"
                    style={{ flexShrink: 0, marginTop: "2px" }}
                  />{" "}
                  <span>100 Projects</span>
                </li>
              </ul>
              <button
                className="btn btn-primary"
                style={{
                  marginTop: "auto",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "0.5rem",
                  width: "100%",
                  padding: "0.6rem",
                  fontSize: "0.9rem",
                }}
                onClick={() => handlePurchase("plus_3m")}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="spin" size={14} />
                ) : (
                  <CreditCard size={14} />
                )}{" "}
                Select Plan
              </button>
            </div>

            {/* 6 Months */}
            <div
              className="card"
              style={{
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                border: "1px solid var(--color-border)",
                borderRadius: "12px",
                background: "var(--color-bg)",
              }}
            >
              <div
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: "0.8rem",
                  fontWeight: "600",
                  marginBottom: "0.5rem",
                }}
              >
                6 MONTHS
              </div>
              <h3 style={{ fontSize: "1.6rem", marginBottom: "0.2rem" }}>
                $39.99
              </h3>
              <div
                style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}
              >
                ($6.66 / mo)
              </div>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "1rem 0 1.5rem 0",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                  fontSize: "0.85rem",
                  color: "var(--color-text-secondary)",
                }}
              >
                <li
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                  }}
                >
                  <Check
                    size={14}
                    color="var(--color-success)"
                    style={{ flexShrink: 0, marginTop: "2px" }}
                  />{" "}
                  <span>
                    <b>60k</b> Credits
                  </span>
                </li>
                <li
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                  }}
                >
                  <Check
                    size={14}
                    color="var(--color-success)"
                    style={{ flexShrink: 0, marginTop: "2px" }}
                  />{" "}
                  <span>180 days access</span>
                </li>
                <li
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                  }}
                >
                  <Check
                    size={14}
                    color="var(--color-success)"
                    style={{ flexShrink: 0, marginTop: "2px" }}
                  />{" "}
                  <span>10 Team Members</span>
                </li>
                <li
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                  }}
                >
                  <Check
                    size={14}
                    color="var(--color-success)"
                    style={{ flexShrink: 0, marginTop: "2px" }}
                  />{" "}
                  <span>100 Projects</span>
                </li>
              </ul>
              <button
                className="btn btn-secondary"
                style={{
                  marginTop: "auto",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "0.5rem",
                  width: "100%",
                  padding: "0.6rem",
                  fontSize: "0.9rem",
                }}
                onClick={() => handlePurchase("plus_6m")}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="spin" size={14} />
                ) : (
                  <CreditCard size={14} />
                )}{" "}
                Select Plan
              </button>
            </div>

            {/* 12 Months */}
            <div
              className="card"
              style={{
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                border: "1px solid var(--color-border)",
                borderRadius: "12px",
                background:
                  "linear-gradient(180deg, rgba(59, 130, 246, 0.03) 0%, var(--color-bg) 100%)",
              }}
            >
              <div
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: "0.8rem",
                  fontWeight: "600",
                  marginBottom: "0.5rem",
                }}
              >
                12 MONTHS (50% OFF)
              </div>
              <h3 style={{ fontSize: "1.6rem", marginBottom: "0.2rem" }}>
                $59.99
              </h3>
              <div
                style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}
              >
                ($4.99 / mo)
              </div>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "1rem 0 1.5rem 0",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                  fontSize: "0.85rem",
                  color: "var(--color-text-secondary)",
                }}
              >
                <li
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                  }}
                >
                  <Check
                    size={14}
                    color="var(--color-success)"
                    style={{ flexShrink: 0, marginTop: "2px" }}
                  />{" "}
                  <span>
                    <b>120k</b> Credits
                  </span>
                </li>
                <li
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                  }}
                >
                  <Check
                    size={14}
                    color="var(--color-success)"
                    style={{ flexShrink: 0, marginTop: "2px" }}
                  />{" "}
                  <span>365 days access</span>
                </li>
                <li
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                  }}
                >
                  <Check
                    size={14}
                    color="var(--color-success)"
                    style={{ flexShrink: 0, marginTop: "2px" }}
                  />{" "}
                  <span>10 Team Members</span>
                </li>
                <li
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                  }}
                >
                  <Check
                    size={14}
                    color="var(--color-success)"
                    style={{ flexShrink: 0, marginTop: "2px" }}
                  />{" "}
                  <span>100 Projects</span>
                </li>
              </ul>
              <button
                className="btn btn-secondary"
                style={{
                  marginTop: "auto",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "0.5rem",
                  width: "100%",
                  padding: "0.6rem",
                  fontSize: "0.9rem",
                }}
                onClick={() => handlePurchase("plus_12m")}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="spin" size={14} />
                ) : (
                  <CreditCard size={14} />
                )}{" "}
                Select Plan
              </button>
            </div>
          </div>
        </div>

        {/* CREDIT PACKS */}
        <div
          style={{
            flex: "1",
            minWidth: "300px",
            background: "var(--color-surface)",
            padding: "2rem",
            borderRadius: "16px",
            border: "1px solid var(--color-border)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ marginBottom: "2rem" }}>
            <h2
              style={{
                fontSize: "1.8rem",
                marginBottom: "0.5rem",
                fontWeight: "600",
              }}
            >
              Buy Credits
            </h2>
            <p style={{ color: "var(--color-text-muted)", fontSize: "1rem" }}>
              One-off credit packs.
            </p>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            {/* $4.99 Pack */}
            <div
              className="card"
              style={{
                padding: "1.2rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                border: "1px solid var(--color-border)",
                borderRadius: "12px",
                background: "var(--color-surface)",
              }}
            >
              <div>
                <div
                  style={{
                    color: "var(--color-primary)",
                    fontSize: "0.75rem",
                    fontWeight: "700",
                    marginBottom: "0.2rem",
                  }}
                >
                  BEST VALUE (2x PROMO)
                </div>
                <h3 style={{ fontSize: "1.2rem", margin: 0 }}>10k Credits</h3>
                <div
                  style={{
                    fontSize: "0.9rem",
                    color: "var(--color-text-muted)",
                    marginTop: "0.2rem",
                  }}
                >
                  $4.99
                </div>
              </div>
              <button
                className="btn btn-secondary"
                style={{ padding: "0.5rem", borderRadius: "8px" }}
                onClick={() => handlePurchase("credits_5000")}
                disabled={isPending}
                title="Buy 10,000 Credits"
              >
                {isPending ? (
                  <Loader2 className="spin" size={16} />
                ) : (
                  <ShoppingBag size={16} />
                )}
              </button>
            </div>

            {/* $1.99 Pack */}
            <div
              className="card"
              style={{
                padding: "1.2rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                border: "1px solid var(--color-border)",
                borderRadius: "12px",
                background: "var(--color-surface)",
              }}
            >
              <div>
                <div
                  style={{
                    color: "var(--color-text-muted)",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    marginBottom: "0.2rem",
                  }}
                >
                  POPULAR (2x PROMO)
                </div>
                <h3 style={{ fontSize: "1.2rem", margin: 0 }}>4,000 Credits</h3>
                <div
                  style={{
                    fontSize: "0.9rem",
                    color: "var(--color-text-muted)",
                    marginTop: "0.2rem",
                  }}
                >
                  $1.99
                </div>
              </div>
              <button
                className="btn btn-secondary"
                style={{ padding: "0.5rem", borderRadius: "8px" }}
                onClick={() => handlePurchase("credits_2000")}
                disabled={isPending}
                title="Buy 4,000 Credits"
              >
                {isPending ? (
                  <Loader2 className="spin" size={16} />
                ) : (
                  <ShoppingBag size={16} />
                )}
              </button>
            </div>

            {/* $0.99 Pack */}
            <div
              className="card"
              style={{
                padding: "1.2rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                border: "1px solid var(--color-border)",
                borderRadius: "12px",
                background: "var(--color-surface)",
              }}
            >
              <div>
                <div
                  style={{
                    color: "var(--color-text-muted)",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    marginBottom: "0.2rem",
                  }}
                >
                  STARTER (2x PROMO)
                </div>
                <h3 style={{ fontSize: "1.2rem", margin: 0 }}>1,000 Credits</h3>
                <div
                  style={{
                    fontSize: "0.9rem",
                    color: "var(--color-text-muted)",
                    marginTop: "0.2rem",
                  }}
                >
                  $0.99
                </div>
              </div>
              <button
                className="btn btn-secondary"
                style={{ padding: "0.5rem", borderRadius: "8px" }}
                onClick={() => handlePurchase("credits_500")}
                disabled={isPending}
                title="Buy 1,000 Credits"
              >
                {isPending ? (
                  <Loader2 className="spin" size={16} />
                ) : (
                  <ShoppingBag size={16} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {purchaseType && (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div className="card" style={{ background: "var(--color-bg)", padding: "2.5rem", borderRadius: "16px", border: "1px solid var(--color-border)", minWidth: "400px", boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}>
            <h2 style={{ marginBottom: "0.5rem", fontSize: "1.6rem" }}>Select Payment Provider</h2>
            <p style={{ color: "var(--color-text-muted)", marginBottom: "2rem" }}>Choose how you'd like to pay for your plan.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <button className="btn btn-secondary" style={{ padding: "1rem", fontSize: "1rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem" }} onClick={() => executePurchase(purchaseType, "lemonsqueezy")} disabled={isPending}>
                {isPending && provider === "lemonsqueezy" ? <Loader2 className="spin" /> : null} Pay with Lemon Squeezy
              </button>
              <button className="btn btn-secondary" style={{ padding: "1rem", fontSize: "1rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem" }} onClick={() => executePurchase(purchaseType, "razorpay")} disabled={isPending}>
                {isPending && provider === "razorpay" ? <Loader2 className="spin" /> : null} Pay with Razorpay
              </button>
            </div>
            <div style={{ marginTop: "2rem", textAlign: "right" }}>
              <button className="btn" onClick={() => setPurchaseType(null)} style={{ background: "transparent", color: "var(--color-text-muted)" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
