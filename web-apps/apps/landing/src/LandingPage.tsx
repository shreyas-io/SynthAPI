import { useState, useEffect } from "react";
import { Background, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const platformBaseUrl =
  import.meta.env.VITE_PLATFORM_BASE_URL?.replace(/\/$/, "") ?? "/platform";

const signupUrl = `${platformBaseUrl}/signup`;
const signinUrl = `${platformBaseUrl}/signin`;

type FeatureId =
  | "workflow-rule-editor"
  | "live-mock-domains"
  | "ai-setup"
  | "collaboration";

const ruleFlowNodes: Node[] = [
  {
    id: "match",
    type: "input",
    position: { x: 120, y: 0 },
    data: { label: "Match ALL rules" },
    className: "rule-flow-node rule-flow-node-root",
  },
  {
    id: "plan",
    position: { x: 0, y: 100 },
    data: { label: "headers.x-plan = enterprise" },
    className: "rule-flow-node",
  },
  {
    id: "amount",
    position: { x: 240, y: 100 },
    data: { label: "body.amount > globals.limit" },
    className: "rule-flow-node",
  },
  {
    id: "response",
    type: "output",
    position: { x: 120, y: 205 },
    data: { label: "Return approved response" },
    className: "rule-flow-node rule-flow-node-output",
  },
];

const ruleFlowEdges: Edge[] = [
  { id: "match-plan", source: "match", target: "plan", animated: true },
  { id: "match-amount", source: "match", target: "amount", animated: true },
  { id: "plan-response", source: "plan", target: "response" },
  { id: "amount-response", source: "amount", target: "response" },
];

const heroFeatures = [
  {
    id: "ai-setup",
    label: "Conversational Builder",
    title: "Conversational Builder",
    text: "Just chat with your agent to instantly generate complex mock endpoints, and routing logic.",
    tags: ["Natural language", "Instant generation", "Context-aware"],
  },
  {
    id: "workflow-rule-editor",
    label: "Visual Rule Trees",
    title: "Visual Rule Trees",
    text: "Go beyond static JSON. Define dynamic responses, edge cases, and errors with an intuitive visual editor.",
    tags: ["Conditional routing", "Dynamic responses", "Error simulation"],
  },
  {
    id: "live-mock-domains",
    label: "Stateful Simulation",
    title: "Stateful Simulation",
    text: "Simulate real backend behavior. Maintain state and use variables across multiple API calls to test realistic user flows.",
    tags: ["State management", "Variables", "Persistent data"],
  },
  {
    id: "collaboration",
    label: "Team Workspaces",
    title: "Team Workspaces",
    text: "Unblock your entire frontend team with shared projects, real-time sync, and role-based access control.",
    tags: ["Shared projects", "Instant sync", "RBAC"],
  },
] as const;

function LogoIcon() {
  return (
    <svg
      viewBox="0 0 40 40"
      role="img"
      focusable="false"
      className="brand-svg-icon"
    >
      <path
        className="brand-bracket"
        d="M16 10H11.5C9.6 10 8 11.6 8 13.5V26.5C8 28.4 9.6 30 11.5 30H16"
      />
      <path
        className="brand-bracket"
        d="M24 10H28.5C30.4 10 32 11.6 32 13.5V26.5C32 28.4 30.4 30 28.5 30H24"
      />
      <path
        className="brand-signal-shadow"
        d="M14.5 20.8H17.8L19.2 17.2L21.2 23L23 19H25.5"
      />
      <path
        className="brand-signal"
        d="M14.5 20H17.8L19.2 16.4L21.2 22.2L23 18.2H25.5"
      />
    </svg>
  );
}

function Logo() {
  return (
    <span className="brand">
      <span className="brand-mark" aria-hidden="true">
        <LogoIcon />
      </span>
      <span className="brand-name">SynthAPI</span>
      <span className="brand-alpha">Alpha</span>
    </span>
  );
}

function FeatureStack() {
  const [activeFeatureId, setActiveFeatureId] = useState<FeatureId>("ai-setup");

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeatureId((currentId) => {
        const currentIndex = heroFeatures.findIndex((f) => f.id === currentId);
        const nextIndex = (currentIndex + 1) % heroFeatures.length;
        return heroFeatures[nextIndex]?.id ?? heroFeatures[0].id;
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [activeFeatureId]);

  const activeFeature =
    heroFeatures.find((f) => f.id === activeFeatureId) || heroFeatures[0];
  const activeIndex = heroFeatures.findIndex((f) => f.id === activeFeatureId);

  return (
    <div
      className="hero-feature-presentation"
      aria-label="SynthAPI feature highlights"
    >
      <nav className="hero-feature-nav" aria-label="Feature navigation">
        <div className="nav-track"></div>
        {heroFeatures.map((feature, index) => {
          const isActive = activeFeatureId === feature.id;

          return (
            <button
              key={feature.id}
              type="button"
              className={`nav-item ${isActive ? "active" : ""}`}
              onClick={() => setActiveFeatureId(feature.id)}
              aria-pressed={isActive}
            >
              <span className="nav-point"></span>
              <span className="nav-label">{feature.label}</span>
            </button>
          );
        })}
      </nav>

      <article className="hero-active-card">
        <div className="layer-badge">
          Layer {String(activeIndex + 1).padStart(2, "0")}
        </div>
        <h3>{activeFeature.title}</h3>
        <p>{activeFeature.text}</p>
        <div className="hero-feature-tags">
          {activeFeature.tags.map((tag) => (
            <small key={tag}>{tag}</small>
          ))}
        </div>
        <FeatureDiagram featureId={activeFeature.id} variant="large" />
      </article>
    </div>
  );
}

function FeatureDiagram({
  featureId,
  variant = "compact",
}: {
  featureId: FeatureId;
  variant?: "compact" | "large";
}) {
  if (featureId === "workflow-rule-editor") {
    return <RuleFlowPreview variant={variant} />;
  }

  if (featureId === "ai-setup") {
    return (
      <div
        className={`feature-diagram ai-diagram ${variant === "large" ? "feature-diagram-large" : ""}`}
        aria-hidden="true"
      >
        <div className="chat-message user-message">
          <p>
            Create a checkout endpoint that fails if the amount is over $100.
          </p>
        </div>
        <div className="chat-message agent-message">
          <div className="agent-avatar">
            <LogoIcon />
          </div>
          <div className="agent-content">
            <p>
              I've created the <code>POST /checkout</code> endpoint with two
              rules:
            </p>
            <div className="agent-attachments">
              <div className="chat-file-attachment">
                <span>rule_success_200</span>
              </div>
              <div className="chat-file-attachment">
                <span>rule_error_amount_exceeded_400</span>
              </div>
            </div>
          </div>
        </div>
        <div className="chat-message user-message">
          <p>Perfect, now add a webhook payload for success.</p>
        </div>
      </div>
    );
  }

  if (featureId === "live-mock-domains") {
    return (
      <div
        className={`feature-diagram stateful-diagram ${variant === "large" ? "feature-diagram-large" : ""}`}
        aria-hidden="true"
      >
        <div className="flowchart-node request-node">
          <code>POST /generate-image</code>
        </div>
        <div className="flowchart-decision">
          <code>user.credits {">"} 0 ?</code>
        </div>
        <div className="flowchart-node response-node success-node">
          <span className="status-chip success">200 OK</span>
          <div className="node-action">
            Set <code>credits = credits - 1</code>
          </div>
        </div>
        <div className="flowchart-node response-node error-node">
          <span className="status-chip error">402 Payment Required</span>
          <div className="node-action">
            Return <code>"Insufficient credits"</code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`feature-diagram workspace-diagram ${variant === "large" ? "feature-diagram-large" : ""}`}
      aria-hidden="true"
    >
      <div className="workspace-header">
        <div className="workspace-title">
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>Core API Mock</span>
        </div>
        <div className="workspace-status">
          <span className="live-indicator"></span> Live Sync
        </div>
      </div>
      <div className="workspace-members">
        <div className="member-row">
          <div className="member-info">
            <div className="member-avatar frontend">F</div>
            <span className="member-name">Frontend Team</span>
          </div>
          <span className="role-badge editor">Editor</span>
        </div>
        <div className="member-row">
          <div className="member-info">
            <div className="member-avatar qa">Q</div>
            <span className="member-name">QA Automation</span>
          </div>
          <span className="role-badge viewer">Viewer</span>
        </div>
        <div className="member-row">
          <div className="member-info">
            <div className="member-avatar partner">P</div>
            <span className="member-name">Partner App</span>
          </div>
          <span className="role-badge viewer">Viewer</span>
        </div>
      </div>
    </div>
  );
}

function RuleFlowPreview({
  variant = "compact",
}: {
  variant?: "compact" | "large";
}) {
  return (
    <div
      className={`rule-flow-preview ${variant === "large" ? "rule-flow-preview-large" : ""}`}
      aria-hidden="true"
    >
      <ReactFlow
        nodes={ruleFlowNodes}
        edges={ruleFlowEdges}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="rgba(105, 210, 231, 0.16)" gap={18} size={1} />
      </ReactFlow>
    </div>
  );
}

export function LandingPage() {
  return (
    <main className="landing-page">
      <div className="hero-shell">
        <header className="site-header">
          <Logo />
          <nav aria-label="Primary navigation"></nav>
        </header>

        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Next-Generation API Simulation</p>
            <h1>Bring complex backend behaviors to life, instantly.</h1>
            <p className="hero-text">
              Standard mock servers fail when you need to test real-world state
              and complex logic. SynthAPI combines generative AI with powerful
              rule trees to build intelligent API replicas. Define your logic
              with AI, and instantly generate production-ready mock APIs that
              keep your teams moving.
            </p>
            <div className="hero-actions">
              <a className="primary-action" href={signupUrl}>
                Start building for free
              </a>
            </div>
            <div className="hero-proof" aria-label="Product capabilities">
              <span>Conditional responses</span>
              <span>Live mock URLs</span>
              <span>AI-assisted setup</span>
            </div>
          </div>

          <div className="hero-divider" aria-hidden="true"></div>

          <FeatureStack />
        </section>
      </div>

      <div className="detailed-features">
        {heroFeatures.map((feature, index) => (
          <section
            key={feature.id}
            className="feature-showcase-section"
            id={feature.id}
          >
            <div className="feature-showcase-diagram">
              <FeatureDiagram featureId={feature.id} variant="large" />
            </div>
            <div className="feature-showcase-copy">
              <h2>{feature.title}</h2>
              <p>{feature.text}</p>
              <a href={signupUrl} className="secondary-action">
                Learn more
              </a>
            </div>
          </section>
        ))}
      </div>

      <section className="cta-section">
        <h2>Give your frontend, QA, and partners an API that is ready now.</h2>
        <a className="primary-action" href={signupUrl}>
          Start building mocks
        </a>
      </section>
    </main>
  );
}
