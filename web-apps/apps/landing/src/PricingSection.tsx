import {
  Sparkles,
  Check,
  CreditCard,
  ShoppingBag,
  Gift,
  Zap,
} from "lucide-react";
import "./PricingSection.css";

const platformBaseUrl =
  import.meta.env.VITE_PLATFORM_BASE_URL?.replace(/\/$/, "") ?? "/platform";
const billingUrl = `${platformBaseUrl}/billing`;

export function PricingSection() {
  const handlePurchase = () => {
    window.location.href = billingUrl;
  };

  return (
    <div className="billing-container" id="pricing">
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
          <h2 style={{ fontSize: "3rem", fontWeight: "800", marginBottom: "1rem" }}>
            Supercharge your workflow
          </h2>
          <p style={{ fontSize: "1.2rem", color: "var(--muted)" }}>
            Choose the perfect plan for your API mocking needs. No hidden fees.
          </p>
        </div>

        <div style={{ display: "flex", gap: "2rem", flexDirection: "column" }}>
          {/* PLUS PLANS */}
          <div>
            <h3 style={{ fontSize: "1.8rem", fontWeight: "700", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Zap color="#8b5cf6" /> Plus Subscriptions
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "2rem" }}>
              {/* 1 Month */}
              <div className="funky-card">
                <div style={{ color: "var(--muted)", fontSize: "0.9rem", fontWeight: "700", marginBottom: "0.5rem" }}>1 MONTH</div>
                <div style={{ fontSize: "2.5rem", margin: "0 0 0.5rem 0", fontWeight: "bold" }}>$9.99</div>
                <div style={{ fontSize: "0.9rem", color: "var(--muted)" }}>Standard access</div>
                
                <ul className="funky-features">
                  <li><Check size={18} /> <span><b>10k</b> Credits</span></li>
                  <li><Check size={18} /> <span>30 days access</span></li>
                  <li><Check size={18} /> <span>10 Team Members</span></li>
                  <li><Check size={18} /> <span>100 Projects</span></li>
                </ul>

                <button
                  className="funky-btn funky-btn-secondary"
                  onClick={handlePurchase}
                >
                  <CreditCard size={18} /> Select Plan
                </button>
              </div>

              {/* 3 Months */}
              <div className="funky-card highlight">
                <div className="funky-badge">25% OFF</div>
                <div style={{ color: "var(--cyan)", fontSize: "0.9rem", fontWeight: "700", marginBottom: "0.5rem" }}>3 MONTHS</div>
                <div style={{ fontSize: "2.5rem", margin: "0 0 0.5rem 0", color: "var(--cyan)", fontWeight: "bold" }}>$22.49</div>
                <div style={{ fontSize: "0.9rem", color: "var(--muted)" }}>($7.49 / mo)</div>
                
                <ul className="funky-features">
                  <li><Check size={18} /> <span><b>30k</b> Credits</span></li>
                  <li><Check size={18} /> <span>90 days access</span></li>
                  <li><Check size={18} /> <span>10 Team Members</span></li>
                  <li><Check size={18} /> <span>100 Projects</span></li>
                </ul>

                <button
                  className="funky-btn funky-btn-primary"
                  onClick={handlePurchase}
                >
                  <CreditCard size={18} /> Get 25% Off
                </button>
              </div>

              {/* 6 Months */}
              <div className="funky-card">
                <div style={{ color: "var(--muted)", fontSize: "0.9rem", fontWeight: "700", marginBottom: "0.5rem" }}>6 MONTHS</div>
                <div style={{ fontSize: "2.5rem", margin: "0 0 0.5rem 0", fontWeight: "bold" }}>$39.99</div>
                <div style={{ fontSize: "0.9rem", color: "var(--muted)" }}>($6.66 / mo)</div>
                
                <ul className="funky-features">
                  <li><Check size={18} /> <span><b>60k</b> Credits</span></li>
                  <li><Check size={18} /> <span>180 days access</span></li>
                  <li><Check size={18} /> <span>10 Team Members</span></li>
                  <li><Check size={18} /> <span>100 Projects</span></li>
                </ul>

                <button
                  className="funky-btn funky-btn-secondary"
                  onClick={handlePurchase}
                >
                  <CreditCard size={18} /> Select Plan
                </button>
              </div>

              {/* 12 Months */}
              <div className="funky-card highlight" style={{ borderColor: "rgba(236, 72, 153, 0.4)", background: "linear-gradient(180deg, rgba(236, 72, 153, 0.1) 0%, var(--surface) 100%)" }}>
                <div className="funky-badge" style={{ background: "#ec4899" }}>50% OFF</div>
                <div style={{ color: "#ec4899", fontSize: "0.9rem", fontWeight: "700", marginBottom: "0.5rem" }}>12 MONTHS</div>
                <div style={{ fontSize: "2.5rem", margin: "0 0 0.5rem 0", color: "#ec4899", fontWeight: "bold" }}>$59.99</div>
                <div style={{ fontSize: "0.9rem", color: "var(--muted)" }}>($4.99 / mo)</div>
                
                <ul className="funky-features">
                  <li><Check size={18} /> <span><b>120k</b> Credits</span></li>
                  <li><Check size={18} /> <span>365 days access</span></li>
                  <li><Check size={18} /> <span>10 Team Members</span></li>
                  <li><Check size={18} /> <span>100 Projects</span></li>
                </ul>

                <button
                  className="funky-btn"
                  style={{ background: "linear-gradient(90deg, #ec4899, #f43f5e)", color: "white" }}
                  onClick={handlePurchase}
                >
                  <CreditCard size={18} /> Get 50% Off
                </button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "3rem", borderTop: "1px solid var(--border)", paddingTop: "3rem" }}>
            <h3 style={{ fontSize: "1.8rem", fontWeight: "700", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <ShoppingBag color="#3b82f6" /> Buy Credits On-Demand
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "2rem" }}>
              {/* $4.99 Pack */}
              <div className="funky-card">
                <div className="funky-badge" style={{ background: "#3b82f6" }}>BEST VALUE</div>
                <div style={{ fontSize: "1.8rem", margin: "1rem 0 0.5rem 0", fontWeight: "bold" }}>10,000 Credits</div>
                <div style={{ fontSize: "1.2rem", color: "var(--muted)", marginBottom: "1.5rem" }}>$4.99</div>
                <button
                  className="funky-btn funky-btn-secondary"
                  onClick={handlePurchase}
                >
                  <ShoppingBag size={18} /> Buy Credits
                </button>
              </div>

              {/* $1.99 Pack */}
              <div className="funky-card">
                <div className="funky-badge" style={{ background: "var(--muted)", color: "var(--bg)" }}>POPULAR</div>
                <div style={{ fontSize: "1.8rem", margin: "1rem 0 0.5rem 0", fontWeight: "bold" }}>4,000 Credits</div>
                <div style={{ fontSize: "1.2rem", color: "var(--muted)", marginBottom: "1.5rem" }}>$1.99</div>
                <button
                  className="funky-btn funky-btn-secondary"
                  onClick={handlePurchase}
                >
                  <ShoppingBag size={18} /> Buy Credits
                </button>
              </div>

              {/* $0.99 Pack */}
              <div className="funky-card">
                <div style={{ fontSize: "1.8rem", margin: "1rem 0 0.5rem 0", fontWeight: "bold" }}>1,000 Credits</div>
                <div style={{ fontSize: "1.2rem", color: "var(--muted)", marginBottom: "1.5rem" }}>$0.99</div>
                <button
                  className="funky-btn funky-btn-secondary"
                  onClick={handlePurchase}
                >
                  <ShoppingBag size={18} /> Buy Credits
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
