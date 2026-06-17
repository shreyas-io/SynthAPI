import { useState } from "react";
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

const features: Array<{
  id: FeatureId;
  title: string;
  text: string;
  detail: string;
}> = [
  {
    id: "workflow-rule-editor",
    title: "Visual logic builder",
    text: "Route requests to different responses with a visual condition tree.",
    detail:
      "Match on headers, body, params, cookies, and variables while keeping success, error, limit, and edge-case responses visible for review before backend code exists.",
  },
  {
    id: "live-mock-domains",
    title: "Live mock endpoints",
    text: "Expose mocks through stable URLs that real clients can call.",
    detail:
      "Point frontend apps, QA suites, demos, and partner integrations at the same mock URL so expected behavior stays available during reviews and handoffs.",
  },
  {
    id: "ai-setup",
    title: "AI mock assistant",
    text: "Use the project agent to create and revise mock endpoints faster.",
    detail:
      "Generate endpoints and responses from a plain-language request, revise behavior as specs change, and keep generated mocks inspectable and editable.",
  },
  {
    id: "collaboration",
    title: "Shared API workspace",
    text: "Keep API behavior, examples, and test scenarios in one place.",
    detail:
      "Give product, frontend, QA, backend, and partners the same mock surface so teams can work in parallel and review behavior changes before they become production contracts.",
  },
];

const workflow = [
  "Create a project workspace",
  "Define endpoints by method and path",
  "Add response rules, variables, headers, cookies, or SSE",
  "Point your app at the generated mock URL",
];

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
    id: "workflow-rule-editor",
    label: "Visual logic builder",
    title: "Route each request to the right mock response.",
    text: "Build condition trees for plans, users, limits, and edge cases without hiding behavior in test setup.",
    tags: ["Conditions", "Response routing"],
  },
  {
    id: "ai-setup",
    label: "AI mock assistant",
    title: "Create and update mock APIs by describing the change.",
    text: "Ask the project agent for endpoints, responses, and revisions, then inspect and edit the result.",
    tags: ["Generate mocks", "Edit results"],
  },
  {
    id: "live-mock-domains",
    label: "Live mock endpoints",
    title: "Use real URLs before real services are ready.",
    text: "Point apps, tests, demos, and partner integrations at stable mock endpoints.",
    tags: ["Stable URLs", "Real clients"],
  },
  {
    id: "collaboration",
    label: "Shared API workspace",
    title: "Keep expected API behavior in one inspectable place.",
    text: "Use the same workspace across product, frontend, QA, backend, and partners.",
    tags: ["Shared mocks", "Team reviews"],
  },
] as const;

function Logo() {
  return (
    <span className="brand">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 40 40" role="img" focusable="false">
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
      </span>
      <span className="brand-name">SynthAPI</span>
      <span className="brand-alpha">Alpha</span>
    </span>
  );
}

function FeatureStack() {
  const [activeFeatureId, setActiveFeatureId] = useState<FeatureId>(
    "workflow-rule-editor",
  );

  return (
    <div
      className="hero-feature-panel"
      aria-label="SynthAPI feature highlights"
    >
      {heroFeatures.map((feature, index) => {
        const isActive = activeFeatureId === feature.id;

        return (
          <article
            className="hero-feature-card"
            data-expanded={isActive}
            key={feature.id}
          >
            <button
              className="hero-feature-card-trigger"
              type="button"
              aria-expanded={isActive}
              aria-controls={`hero-feature-detail-${feature.id}`}
              onClick={() => setActiveFeatureId(feature.id)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{feature.label}</strong>
            </button>
            <div
              className="hero-feature-card-detail"
              id={`hero-feature-detail-${feature.id}`}
              hidden={!isActive}
            >
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
              <FeatureDiagram featureId={feature.id} variant="large" />
              <div className="hero-feature-tags">
                {feature.tags.map((tag) => (
                  <small key={tag}>{tag}</small>
                ))}
              </div>
              <a className="hero-feature-link" href={`#${feature.id}`}>
                View feature
              </a>
            </div>
          </article>
        );
      })}
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
        <div className="ai-prompt-card">
          <span>Request</span>
          <p>Create checkout, refund, and webhook mocks.</p>
        </div>
        <div className="diagram-line" />
        <div className="diagram-node ai-node">Agent</div>
        <div className="diagram-line" />
        <div className="ai-output-stack">
          <span>Endpoints</span>
          <span>Responses</span>
          <span>Updates</span>
        </div>
      </div>
    );
  }

  if (featureId === "live-mock-domains") {
    return (
      <div
        className={`feature-diagram domain-diagram ${variant === "large" ? "feature-diagram-large" : ""}`}
        aria-hidden="true"
      >
        <pre className="domain-curl">{`curl https://acme.mock.synthapi.dev/checkout/sess_123 \\
  -H "content-type: application/json" \\
  -d '{"amount": 4900, "currency": "usd"}'`}</pre>
        <div className="domain-result">
          <span>HTTP 200</span>
          <code>{`{ "status": "approved" }`}</code>
        </div>
        <div className="domain-status-row">
          <span>Frontend</span>
          <span>QA suite</span>
          <span>Partner</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`feature-diagram collaboration-diagram ${variant === "large" ? "feature-diagram-large" : ""}`}
      aria-hidden="true"
    >
      <div className="team-node product">Product</div>
      <div className="team-node design">Design</div>
      <div className="team-node qa">QA</div>
      <div className="team-node partners">Partners</div>
      <div className="workspace-node">Mock workspace</div>
      <div className="collaboration-note">
        Same endpoints, responses, rules, and examples
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
      <header className="site-header">
        <Logo />
        <nav aria-label="Primary navigation"></nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Mock APIs with real behavior</p>
          <h1>Build API sandboxes before the backend is ready.</h1>
          <p className="hero-text">
            SynthAPI gives teams live mock endpoints, conditional responses,
            request-aware templates, variables, SSE streams, and an AI agent for
            creating and maintaining mocks.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href={signupUrl}>
              Sign up
            </a>
            <a className="secondary-action" href={signinUrl}>
              Sign in
            </a>
          </div>
          <div className="hero-proof" aria-label="Product capabilities">
            <span>Conditional responses</span>
            <span>Live mock URLs</span>
            <span>AI-assisted setup</span>
          </div>
        </div>
        <FeatureStack />
      </section>

      <section className="workflow-section" id="workflow">
        <div className="workflow-copy">
          <h2>From route idea to callable endpoint.</h2>
          <p>
            Define the API shape, attach behavior, and hand teams a URL they can
            use immediately.
          </p>
        </div>
        <div className="workflow-steps">
          {workflow.map((step) => (
            <article className="workflow-step" key={step}>
              <p>{step}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="feature-sections" id="features">
        {features.map((feature, index) => (
          <section
            className="feature-detail-section"
            id={feature.id}
            key={feature.title}
          >
            <div className="feature-detail-copy">
              <h2>{feature.title}</h2>
              <p>{feature.text}</p>
              <p>{feature.detail}</p>
            </div>
            <FeatureDiagram featureId={feature.id} />
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
