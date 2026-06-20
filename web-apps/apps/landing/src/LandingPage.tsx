import { useState, useEffect } from "react";
import { Background, ReactFlow, type Edge, type Node } from "@xyflow/react";
import { RuleTreePreview, type RuleTreePreviewTree } from "@synthapi/ui";
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

type LandingFeature = {
  id: FeatureId;
  label: string;
  title: string;
  heroText: string;
  detailParagraphs?: readonly string[];
  tags: readonly string[];
  icon: React.ReactNode;
};

const ChatIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);

const TreeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="6" y1="3" x2="6" y2="15"></line>
    <circle cx="18" cy="6" r="3"></circle>
    <circle cx="6" cy="18" r="3"></circle>
    <path d="M18 9a9 9 0 0 1-9 9"></path>
  </svg>
);

const DatabaseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
  </svg>
);

const UsersIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

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

const workflowRuleTreePreview: RuleTreePreviewTree = {
  label: "Checkout rules",
  type: "and",
  predicates: [
    {
      actual: "{{request.headers.authorization}}",
      operator: "is_set",
    },
  ],
  children: [
    {
      label: "Risk checks",
      type: "or",
      predicates: [
        {
          actual: "{{request.headers.x-plan}}",
          operator: "equals",
          expected: "enterprise",
        },
        {
          actual: "{{request.body.amount}}",
          operator: "gt",
          expected: 100,
        },
        {
          actual: "{{request.body.country}}",
          operator: "equals",
          expected: "restricted",
        },
      ],
      children: [],
    },
  ],
};

const heroFeatures = [
  {
    id: "ai-setup",
    icon: <ChatIcon />,
    label: "Conversational Builder",
    title: "Conversational Builder",
    heroText:
      "Just chat with your agent to instantly generate complex mock endpoints, and routing logic.",
    detailParagraphs: [
      "Start with intent instead of boilerplate. Describe the endpoint you need, the payload shape, auth rules, and failure conditions in plain English, and SynthAPI scaffolds routes, responses, and starter logic in seconds.",
      "Then keep iterating in the same conversation. Ask for follow-up rules, payload changes, validation branches, or webhook behavior, and the agent applies those updates without forcing you through a manual rebuild.",
    ],
    tags: ["Natural language", "Instant generation", "Context-aware"],
  },
  {
    id: "workflow-rule-editor",
    icon: <TreeIcon />,
    label: "Visual Rule Trees",
    title: "Visual Rule Trees",
    heroText:
      "Go beyond static JSON. Define dynamic responses, edge cases, and errors with an intuitive visual editor.",
    detailParagraphs: [
      "Map request logic the way you actually reason about it. Build nested groups for headers, body fields, and request context so complex matching rules stay readable instead of collapsing into brittle JSON.",
      "When flows branch, your team can see the full condition structure at a glance, tighten edge cases visually, and evolve the rule tree without losing track of how the request is being evaluated.",
    ],
    tags: ["Conditional routing", "Dynamic responses", "Error simulation"],
  },
  {
    id: "live-mock-domains",
    icon: <DatabaseIcon />,
    label: "Stateful Simulation",
    title: "Stateful Simulation",
    heroText:
      "Simulate real backend behavior. Maintain state and use variables across multiple API calls to test realistic user flows.",
    detailParagraphs: [
      "Don't settle for static JSON responses that forget what just happened. SynthAPI lets you define globals, constants, and session-scoped variables that mutate as requests flow through your mock.",
      "Test end-to-end user journeys reliably. When a frontend flow creates a resource via POST, updates an array variable, or deducts credits, the next GET request will naturally reflect those changes-bridging the gap between a mock server and a real backend.",
    ],
    tags: ["State management", "Variables", "Persistent data"],
  },
  {
    id: "collaboration",
    icon: <UsersIcon />,
    label: "Team Workspaces",
    title: "Team Workspaces",
    heroText:
      "Unblock your entire frontend team with shared projects, real-time sync, and role-based access control.",
    detailParagraphs: [
      "Building robust applications requires tight alignment between frontend, QA, and backend teams. SynthAPI workspaces act as a single source of truth where teams can collaboratively design and consume API contracts before the actual backend is finished.",
      "Assign granular roles to keep things secure. Let lead engineers edit rule trees and state mutations, while giving QA read-only access to run tests against stable mock environments, and granting external partners securely scoped API keys.",
    ],
    tags: ["Shared projects", "Instant sync", "RBAC"],
  },
] as const satisfies readonly LandingFeature[];

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
        <p>{activeFeature.heroText}</p>
        <div className="hero-feature-tags">
          {activeFeature.tags.map((tag) => (
            <small key={tag}>{tag}</small>
          ))}
        </div>
        <FeatureDiagram
          featureId={activeFeature.id}
          variant="large"
          surface="hero"
        />
      </article>
    </div>
  );
}

function FeatureDiagram({
  featureId,
  variant = "compact",
  surface = "hero",
}: {
  featureId: FeatureId;
  variant?: "compact" | "large";
  surface?: "hero" | "detail";
}) {
  if (featureId === "workflow-rule-editor") {
    if (surface === "detail") {
      return (
        <RuleTreePreview
          tree={workflowRuleTreePreview}
          selectedNodePath="root.children.0.predicates.1"
          className="landing-rule-tree-preview"
        />
      );
    }

    return <RuleFlowPreview variant={variant} />;
  }

  if (featureId === "ai-setup") {
    if (surface === "detail") {
      return (
        <div
          className={`feature-diagram ai-diagram ai-diagram-detail ${variant === "large" ? "feature-diagram-large" : ""}`}
          aria-hidden="true"
        >
          <div className="chat-message user-message">
            <p>
              Create a <code>POST /checkout</code> mock. Return <code>200</code>{" "}
              with an <code>orderId</code>, and return <code>402</code> if the
              customer has no credits.
            </p>
          </div>
          <div className="chat-message agent-message">
            <div className="agent-avatar">
              <LogoIcon />
            </div>
            <div className="agent-content">
              <p>
                Scaffolded the endpoint with request validation and two starter
                response branches.
              </p>
              <div className="agent-attachments">
                <div className="chat-file-attachment">
                  <span>endpoint_checkout</span>
                </div>
                <div className="chat-file-attachment">
                  <span>response_success_200</span>
                </div>
                <div className="chat-file-attachment">
                  <span>response_insufficient_402</span>
                </div>
              </div>
            </div>
          </div>
          <div className="chat-message user-message">
            <p>
              Great. Add a fraud rule when <code>amount &gt; 100</code>, and
              trigger a webhook payload on success.
            </p>
          </div>
          <div className="chat-message agent-message">
            <div className="agent-avatar">
              <LogoIcon />
            </div>
            <div className="agent-content">
              <p>
                Added a fraud review branch, updated the success payload, and
                queued a webhook body for the happy path.
              </p>
              <div className="agent-attachments">
                <div className="chat-file-attachment">
                  <span>rule_fraud_review_409</span>
                </div>
                <div className="chat-file-attachment">
                  <span>webhook_checkout_succeeded</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

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
    if (surface === "detail") {
      return (
        <div
          className={`feature-diagram stateful-diagram stateful-diagram-detail ${variant === "large" ? "feature-diagram-large" : ""}`}
          aria-hidden="true"
        >
          <div className="state-timeline">
            <div className="state-step">
              <div className="step-request">
                <div><span className="http-method post">POST</span> <code>/cart</code></div>
                <div className="request-body"><code>{`body: { id: "p1" }`}</code></div>
              </div>
              <div className="step-mutation">
                <div className="mutation-label">Action: Append</div>
                <code>cart.push(body.id)</code>
              </div>
              <div className="step-response success">
                <span className="status-chip success">201 Created</span>
              </div>
            </div>

            <div className="state-step-connector"></div>

            <div className="state-step">
              <div className="step-request">
                <div>
                  <span className="http-method get">GET</span>{" "}
                  <code>/checkout</code>
                </div>
              </div>
              <div className="step-condition">
                <div className="condition-label">Condition: Has Items</div>
                <code>cart.length {">"} 0</code>
              </div>
              <div className="step-response success">
                <span className="status-chip success">200 OK</span>
                <div className="response-body"><code>{`items: ["p1"]`}</code></div>
              </div>
            </div>

            <div className="state-step-connector"></div>

            <div className="state-step">
              <div className="step-request">
                <div>
                  <span className="http-method post">POST</span>{" "}
                  <code>/checkout/pay</code>
                </div>
              </div>
              <div className="step-mutation">
                <div className="mutation-label">Action: Reset</div>
                <code>cart = []</code>
              </div>
              <div className="step-response success">
                <span className="status-chip success">200 OK</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

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

  if (featureId === "collaboration") {
    if (surface === "detail") {
      return (
        <div
          className={`feature-diagram workspace-diagram workspace-diagram-detail ${variant === "large" ? "feature-diagram-large" : ""}`}
          aria-hidden="true"
        >
          <div className="workspace-sidebar">
            <div className="sidebar-section">
              <div className="sidebar-title">Projects</div>
              <div className="sidebar-item active">Core API Mock</div>
              <div className="sidebar-item">Partner Webhooks</div>
              <div className="sidebar-item">Legacy v1 API</div>
            </div>
          </div>
          <div className="workspace-main">
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
            <div className="workspace-tabs">
              <div className="tab active">Members</div>
              <div className="tab">API Keys</div>
              <div className="tab">Audit Logs</div>
            </div>
            <div className="workspace-members">
              <div className="member-row">
                <div className="member-info">
                  <div className="member-avatar frontend">F</div>
                  <div className="member-details">
                    <span className="member-name">Frontend Team</span>
                    <span className="member-email">frontend@acme.com</span>
                  </div>
                </div>
                <span className="role-badge admin">Admin</span>
              </div>
              <div className="member-row">
                <div className="member-info">
                  <div className="member-avatar qa">Q</div>
                  <div className="member-details">
                    <span className="member-name">QA Automation</span>
                    <span className="member-email">ci-runner@acme.com</span>
                  </div>
                </div>
                <span className="role-badge member">Member</span>
              </div>
              <div className="member-row">
                <div className="member-info">
                  <div className="member-avatar partner">P</div>
                  <div className="member-details">
                    <span className="member-name">Partner App</span>
                    <span className="member-email">external@partner.com</span>
                  </div>
                </div>
                <span className="role-badge member">Member</span>
              </div>
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
            <span className="role-badge admin">Admin</span>
          </div>
          <div className="member-row">
            <div className="member-info">
              <div className="member-avatar qa">Q</div>
              <span className="member-name">QA Automation</span>
            </div>
            <span className="role-badge member">Member</span>
          </div>
          <div className="member-row">
            <div className="member-info">
              <div className="member-avatar partner">P</div>
              <span className="member-name">Partner App</span>
            </div>
            <span className="role-badge member">Member</span>
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
          <span className="role-badge admin">Admin</span>
        </div>
        <div className="member-row">
          <div className="member-info">
            <div className="member-avatar qa">Q</div>
            <span className="member-name">QA Automation</span>
          </div>
          <span className="role-badge member">Member</span>
        </div>
        <div className="member-row">
          <div className="member-info">
            <div className="member-avatar partner">P</div>
            <span className="member-name">Partner App</span>
          </div>
          <span className="role-badge member">Member</span>
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
              <FeatureDiagram
                featureId={feature.id}
                variant="large"
                surface="detail"
              />
            </div>
            <div className="feature-showcase-copy">
              <div className="layer-badge">{feature.label}</div>
              <h2 className="feature-section-header">
                <span className="feature-section-icon">{feature.icon}</span>
                {feature.title}
              </h2>
              <div className="feature-showcase-body">
                {(feature.detailParagraphs ?? [feature.heroText]).map(
                  (paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ),
                )}
              </div>
              <a href={signupUrl} className="secondary-action">
                Learn more
              </a>
            </div>
          </section>
        ))}
      </div>

      <section className="cta-section">
        <h2>Give your frontend, QA, and partners an API that is ready now.</h2>
        <p className="cta-subtitle">Stop waiting on backend teams. Start simulating real APIs in minutes.</p>
        <a className="primary-action" href={signupUrl}>
          Start building mocks
        </a>
      </section>
    </main>
  );
}
