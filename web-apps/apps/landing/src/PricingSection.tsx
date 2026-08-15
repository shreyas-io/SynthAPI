import { Check } from "lucide-react";
import "./PricingSection.css";

const platformBaseUrl =
  import.meta.env.VITE_PLATFORM_BASE_URL?.replace(/\/$/, "") ?? "/platform";
const billingUrl = `${platformBaseUrl}/billing`;

export function PricingSection() {
  const handlePurchase = () => {
    window.location.href = billingUrl;
  };

  return (
    <section className="pricing-section" id="pricing">
      <div className="pricing-container">
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
              {/* Empty spacing */}
            </div>
            <div className="pricing-card-action">
              <button
                className="pricing-btn pricing-btn-secondary"
                onClick={handlePurchase}
              >
                Get started
              </button>
            </div>
            <ul className="pricing-features">
              <li><Check size={18} /> 1k Credits</li>
              <li><Check size={18} /> 30 days access</li>
              <li><Check size={18} /> 1 Team Member</li>
              <li><Check size={18} /> 3 Projects</li>
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
            </div>
            <div className="pricing-card-billing-info">
              One-time payment
            </div>
            <div className="pricing-card-action">
              <button
                className="pricing-btn pricing-btn-secondary"
                onClick={handlePurchase}
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
              <span className="amount">22.49</span>
            </div>
            <div className="pricing-card-billing-info">
              <span className="savings">($7.49 / mo)</span>
            </div>
            <div className="pricing-card-action">
              <button
                className="pricing-btn pricing-btn-secondary"
                onClick={handlePurchase}
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
              <span className="amount">39.99</span>
            </div>
            <div className="pricing-card-billing-info">
              <span className="savings">($6.66 / mo)</span>
            </div>
            <div className="pricing-card-action">
              <button
                className="pricing-btn pricing-btn-secondary"
                onClick={handlePurchase}
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
              <span className="amount">59.99</span>
            </div>
            <div className="pricing-card-billing-info">
              <span className="savings">($4.99 / mo)</span>
            </div>
            <div className="pricing-card-action">
              <button
                className="pricing-btn pricing-btn-primary"
                onClick={handlePurchase}
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
        </div>

        <div className="pricing-header" style={{ marginTop: "6rem", marginBottom: "3rem" }}>
          <h3 style={{ fontSize: "1.8rem", fontWeight: "600" }}>Buy Credits On-Demand</h3>
        </div>

        <div className="pricing-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
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
                onClick={handlePurchase}
              >
                Buy Credits
              </button>
            </div>
          </div>

          {/* $1.99 Pack */}
          <div className="pricing-card">
            <div className="pricing-badge" style={{ backgroundColor: "var(--muted)" }}>Popular</div>
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
                onClick={handlePurchase}
              >
                Buy Credits
              </button>
            </div>
          </div>

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
                onClick={handlePurchase}
              >
                Buy Credits
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
