import type React from "react";
import { useState } from "react";

const platformBaseUrl =
  import.meta.env.VITE_PLATFORM_BASE_URL?.replace(/\/$/, "") ?? "/platform";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";

const docsUrl = "/docs/";
const signupUrl = `${platformBaseUrl}/signup`;
const signinUrl = `${platformBaseUrl}/signin`;
const contactUrl = `${apiBaseUrl}/api/v1/contact`;

type RuleTreeNode =
  | {
      kind: "group";
      mode: "AND" | "OR";
      label: string;
      children: RuleTreeNode[];
    }
  | {
      kind: "predicate";
      actual: string;
      operator: string;
      expected?: string;
    };

type ChatMessageItem =
  | { role: "user"; text: string }
  | { role: "agent"; text: string; attachments?: readonly string[] };

type StateStep = {
  method: "POST" | "GET" | "PUT" | "DELETE";
  path: string;
  body?: string;
  mutation?: string;
  status: string;
  statusTone: "success" | "error";
  stateAfter: string;
};

type WorkspaceMember = {
  initials: string;
  tone: "cyan" | "amber" | "violet";
  name: string;
  email: string;
  role: "Admin" | "Member";
};

type WorkspaceData = {
  org: string;
  members: readonly WorkspaceMember[];
};

type LandingFeature = {
  id: string;
  label: string;
  title: string;
  heroText: string;
  detailParagraphs?: readonly string[];
  tags: readonly string[];
  icon: React.ReactNode;
  code: readonly string[];
  ruleTree?: RuleTreeNode;
  chat?: readonly ChatMessageItem[];
  stateTimeline?: readonly StateStep[];
  workspace?: WorkspaceData;
};

const ChatIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);

const TreeIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="6" y1="3" x2="6" y2="15"></line>
    <circle cx="18" cy="6" r="3"></circle>
    <circle cx="6" cy="18" r="3"></circle>
    <path d="M18 9a9 9 0 0 1-9 9"></path>
  </svg>
);

const DatabaseIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
  </svg>
);

const UsersIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const heroFeatures = [
  {
    id: "ai-setup",
    icon: <ChatIcon />,
    label: "Conversational Builder",
    title: "Conversational Builder",
    heroText:
      "Just chat with your agent to instantly generate complex mock endpoints and routing logic.",
    detailParagraphs: [
      "Start with intent instead of boilerplate. Describe the endpoint you need, the payload shape, auth rules, and failure conditions in plain English, and SynthAPI scaffolds routes, responses, and starter logic in seconds.",
      "Keep iterating in the same conversation. Ask for follow-up rules, payload changes, validation branches, or webhook behavior, and the agent applies those updates without forcing you through a manual rebuild.",
    ],
    tags: ["Natural language", "Instant generation", "Context-aware"],
    code: [],
    chat: [
      {
        role: "user",
        text: "Create a POST /checkout mock. Return 200 with an orderId, and 402 if the customer has no credits.",
      },
      {
        role: "agent",
        text: "Scaffolded the endpoint with request validation and two starter response branches.",
        attachments: [
          "endpoint_checkout",
          "response_success_200",
          "response_insufficient_402",
        ],
      },
      {
        role: "user",
        text: "Great. Add a fraud rule when amount > 100, and trigger a webhook payload on success.",
      },
      {
        role: "agent",
        text: "Added a fraud review branch, updated the success payload, and queued a webhook body for the happy path.",
        attachments: ["rule_fraud_review_409", "webhook_checkout_succeeded"],
      },
    ],
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
    code: [],
    ruleTree: {
      kind: "group",
      mode: "AND",
      label: "Checkout rules",
      children: [
        {
          kind: "predicate",
          actual: "headers.authorization",
          operator: "is_set",
        },
        {
          kind: "group",
          mode: "OR",
          label: "Risk checks",
          children: [
            {
              kind: "predicate",
              actual: "headers.x-plan",
              operator: "equals",
              expected: '"enterprise"',
            },
            {
              kind: "predicate",
              actual: "body.amount",
              operator: "gt",
              expected: "100",
            },
            {
              kind: "predicate",
              actual: "body.country",
              operator: "equals",
              expected: '"restricted"',
            },
          ],
        },
      ],
    },
  },
  {
    id: "live-mock-domains",
    icon: <DatabaseIcon />,
    label: "Stateful Simulation",
    title: "Stateful Simulation",
    heroText:
      "Simulate real backend behavior. Maintain state and variables across calls to test realistic user flows.",
    detailParagraphs: [
      "Don't settle for static JSON responses that forget what just happened. SynthAPI lets you define globals, constants, and session-scoped variables that mutate as requests flow through your mock.",
      "Test end-to-end user journeys reliably. When a flow creates a resource via POST, updates a variable, or deducts credits, the next GET will naturally reflect those changes - bridging the gap between a mock server and a real backend.",
    ],
    tags: ["State management", "Variables", "Persistent data"],
    code: [],
    stateTimeline: [
      {
        method: "POST",
        path: "/cart",
        body: '{ id: "p1" }',
        mutation: "cart.push(body.id)",
        status: "201",
        statusTone: "success",
        stateAfter: 'cart = ["p1"]',
      },
      {
        method: "GET",
        path: "/checkout",
        mutation: "guard: cart.length > 0",
        status: "200",
        statusTone: "success",
        stateAfter: 'cart = ["p1"]',
      },
      {
        method: "POST",
        path: "/checkout/pay",
        mutation: "cart = []",
        status: "200",
        statusTone: "success",
        stateAfter: "cart = []",
      },
    ],
  },
  {
    id: "collaboration",
    icon: <UsersIcon />,
    label: "Team Workspaces",
    title: "Team Workspaces",
    heroText:
      "Unblock your entire frontend team with shared projects, real-time sync, and role-based access control.",
    detailParagraphs: [
      "Building robust applications requires tight alignment between frontend, QA, and backend teams. SynthAPI workspaces act as a single source of truth where teams can design and consume API contracts before the backend is finished.",
      "Manage access at the organisation level with role-based permissions. Let lead engineers edit rule trees and state mutations, while giving QA read-only access so teams stay aligned without stepping on each other.",
    ],
    tags: ["Shared projects", "Instant sync", "RBAC"],
    code: [],
    workspace: {
      org: "Default org",
      members: [
        {
          initials: "F",
          tone: "cyan",
          name: "Frontend Team",
          email: "frontend@acme.com",
          role: "Admin",
        },
        {
          initials: "Q",
          tone: "amber",
          name: "QA Automation",
          email: "ci-runner@acme.com",
          role: "Member",
        },
        {
          initials: "P",
          tone: "violet",
          name: "Partner App",
          email: "external@partner.com",
          role: "Member",
        },
      ],
    },
  },
] satisfies readonly LandingFeature[];

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
        className="brand-signal"
        d="M14.5 20H17.8L19.2 16.4L21.2 22.2L23 18.2H25.5"
      />
    </svg>
  );
}

function Logo() {
  return (
    <a className="brand" href="/">
      <span className="brand-mark" aria-hidden="true">
        <LogoIcon />
      </span>
      <span className="brand-name">SynthAPI</span>
    </a>
  );
}

const faqs = [
  {
    question: "What is SynthAPI?",
    answer:
      "SynthAPI is an AI-native mock API platform. You describe endpoints in plain English, refine them in conversation, and get production-shaped mocks with conditional responses, state, and variables - no backend required.",
  },
  {
    question: "Do I need to write JSON by hand?",
    answer:
      "No. The conversational builder scaffolds routes, responses, and rules for you. When you want fine control, the visual rule tree editor keeps complex matching logic readable without raw JSON.",
  },
  {
    question: "Can mocks remember state between calls?",
    answer:
      "Yes. SynthAPI supports globals, constants, and session-scoped variables that mutate as requests flow through your mock, so end-to-end user journeys behave like a real backend.",
  },
  {
    question: "How do teams collaborate?",
    answer:
      "Workspaces act as a single source of truth with shared projects, real-time sync, and role-based access - lead engineers can edit and QA can run read-only tests.",
  },
  {
    question: "Can I use SynthAPI in CI and automated tests?",
    answer:
      "Yes. Each workspace exposes stable mock URLs and scoped API keys, so QA runners and integration suites can hit deterministic endpoints without manual setup.",
  },
] as const;

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <li className={`faq-item ${open ? "open" : ""}`}>
      <button
        type="button"
        className="faq-question"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{q}</span>
        <span className="faq-mark" aria-hidden="true">
          {open ? "-" : "+"}
        </span>
      </button>
      <div className="faq-answer">
        <p>{a}</p>
      </div>
    </li>
  );
}

function HeroSnippet() {
  return (
    <div className="code-tile hero-snippet" aria-hidden="true">
      <div className="code-tile-bar">
        <span className="code-tile-dot" />
        <span className="code-tile-dot" />
        <span className="code-tile-dot" />
        <span className="code-tile-title">synthapi</span>
      </div>
      <pre className="code-tile-body">
        <code>
          <span className="tok-prompt">$</span>{" "}
          <span className="tok-cmd">synthapi new</span>{" "}
          <span className="tok-method">POST</span>{" "}
          <span className="tok-path">/checkout</span>
          <span className="tok-cursor" />
          {"\n"}
          <span className="tok-ok">✓</span> scaffolded{" "}
          <span className="tok-muted">POST</span>{" "}
          <span className="tok-path">/checkout</span>
          {"\n"}
          <span className="tok-ok">✓</span> added rule:{" "}
          <span className="tok-rule">rule_success_200</span>
          {"\n"}
          <span className="tok-ok">✓</span> added rule:{" "}
          <span className="tok-rule">rule_error_amount_exceeded_400</span>
          {"\n"}
          <span className="tok-ok">✓</span> mock live at{" "}
          <a
            className="tok-url"
            href={signupUrl}
            onClick={(e) => e.preventDefault()}
          >
            https://mock.synthapi.dev/checkout
          </a>
        </code>
      </pre>
    </div>
  );
}

function FeatureCodeTile({ lines }: { lines: readonly string[] }) {
  return (
    <div className="code-tile" aria-hidden="true">
      <div className="code-tile-bar">
        <span className="code-tile-dot" />
        <span className="code-tile-dot" />
        <span className="code-tile-dot" />
      </div>
      <pre className="code-tile-body">
        <code>{lines.join("\n")}</code>
      </pre>
    </div>
  );
}

function RuleTreeDiagram({ tree }: { tree: RuleTreeNode }) {
  const renderNode = (node: RuleTreeNode, isLast: boolean): React.ReactNode => {
    if (node.kind === "group") {
      return (
        <li className="rt-node rt-group" key={node.label}>
          <div className="rt-node-card">
            <span
              className={`rt-mode ${node.mode === "AND" ? "rt-mode-and" : "rt-mode-or"}`}
            >
              {node.mode}
            </span>
            <span className="rt-label">{node.label}</span>
          </div>
          {node.children.length > 0 && (
            <ul className="rt-children">
              {node.children.map((child, i) =>
                renderNode(child, i === node.children.length - 1),
              )}
            </ul>
          )}
        </li>
      );
    }

    return (
      <li
        className={`rt-node rt-predicate ${isLast ? "rt-last" : ""}`}
        key={node.actual}
      >
        <div className="rt-node-card">
          <span className="rt-predicate-actual">{node.actual}</span>
          <span className="rt-predicate-op">{node.operator}</span>
          {node.expected !== undefined && (
            <span className="rt-predicate-expected">{node.expected}</span>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className="rule-tree-diagram" aria-hidden="true">
      <div className="code-tile-bar">
        <span className="code-tile-dot" />
        <span className="code-tile-dot" />
        <span className="code-tile-dot" />
        <span className="code-tile-title">rule-tree</span>
      </div>
      <div className="rule-tree-body">
        <ul className="rt-root">{renderNode(tree, true)}</ul>
      </div>
    </div>
  );
}

function ChatDiagram({ messages }: { messages: readonly ChatMessageItem[] }) {
  return (
    <div className="chat-diagram" aria-hidden="true">
      <div className="code-tile-bar">
        <span className="code-tile-dot" />
        <span className="code-tile-dot" />
        <span className="code-tile-dot" />
        <span className="code-tile-title">synthapi chat</span>
      </div>
      <div className="chat-body">
        {messages.map((message, index) =>
          message.role === "user" ? (
            <div className="chat-row chat-row-user" key={index}>
              <div className="chat-bubble chat-bubble-user">
                <span className="chat-role">you</span>
                <p>{message.text}</p>
              </div>
            </div>
          ) : (
            <div className="chat-row chat-row-agent" key={index}>
              <div className="chat-agent-avatar" aria-hidden="true">
                <LogoIcon />
              </div>
              <div className="chat-bubble chat-bubble-agent">
                <span className="chat-role">synthapi</span>
                <p>{message.text}</p>
                {message.attachments && message.attachments.length > 0 && (
                  <div className="chat-attachments">
                    {message.attachments.map((attachment) => (
                      <span className="chat-attachment" key={attachment}>
                        <span
                          className="chat-attachment-icon"
                          aria-hidden="true"
                        >
                          {"{}"}
                        </span>
                        {attachment}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function StateTimelineDiagram({ steps }: { steps: readonly StateStep[] }) {
  return (
    <div className="state-timeline-diagram" aria-hidden="true">
      <div className="code-tile-bar">
        <span className="code-tile-dot" />
        <span className="code-tile-dot" />
        <span className="code-tile-dot" />
        <span className="code-tile-title">state-trace</span>
      </div>
      <div className="state-timeline-body">
        {steps.map((step, index) => (
          <div className="state-step-wrap" key={step.path}>
            <div className="state-step">
              <div className="state-step-request">
                <span
                  className={`http-method http-method-${step.method.toLowerCase()}`}
                >
                  {step.method}
                </span>
                <code className="state-step-path">{step.path}</code>
                <span
                  className={`state-status state-status-${step.statusTone}`}
                >
                  {step.status}
                </span>
              </div>
              {step.body && (
                <div className="state-step-body">
                  <span className="state-label">body</span>
                  <code>{step.body}</code>
                </div>
              )}
              {step.mutation && (
                <div className="state-step-mutation">
                  <span className="state-label">action</span>
                  <code>{step.mutation}</code>
                </div>
              )}
              <div className="state-step-snapshot">
                <span className="state-label">state</span>
                <code className="state-snapshot-value">{step.stateAfter}</code>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className="state-step-connector" aria-hidden="true">
                <span className="state-step-arrow">↓</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkspaceDiagram({ workspace }: { workspace: WorkspaceData }) {
  return (
    <div className="workspace-diagram" aria-hidden="true">
      <div className="code-tile-bar">
        <span className="code-tile-dot" />
        <span className="code-tile-dot" />
        <span className="code-tile-dot" />
        <span className="code-tile-title">workspace</span>
      </div>
      <div className="workspace-body">
        <div className="ws-main">
          <header className="ws-header">
            <span className="ws-project-name">{workspace.org}</span>
            <span className="ws-live">
              <span className="ws-live-dot" aria-hidden="true" />
              Live Sync
            </span>
          </header>
          <div className="ws-tabs">
            <span className="ws-tab active">Members</span>
          </div>
          <ul className="ws-members">
            {workspace.members.map((member) => (
              <li className="ws-member" key={member.email}>
                <div className="ws-member-info">
                  <span
                    className={`ws-member-avatar ws-avatar-${member.tone}`}
                    aria-hidden="true"
                  >
                    {member.initials}
                  </span>
                  <div className="ws-member-details">
                    <span className="ws-member-name">{member.name}</span>
                    <span className="ws-member-email">{member.email}</span>
                  </div>
                </div>
                <span
                  className={`ws-role-badge ws-role-${member.role.toLowerCase()}`}
                >
                  {member.role}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

type ContactFormStatus =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "success" }
  | { state: "error"; message: string };

function ContactForm({ endpoint }: { endpoint: string }) {
  const [status, setStatus] = useState<ContactFormStatus>({ state: "idle" });

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (status.state === "submitting") return;

    setStatus({ state: "submitting" });
    try {
      const data = new FormData(form);
      const payload = {
        name: String(data.get("name") ?? "").trim(),
        email: String(data.get("email") ?? "").trim(),
        company: String(data.get("company") ?? "").trim() || undefined,
        message: String(data.get("message") ?? "").trim(),
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }

      setStatus({ state: "success" });
      form.reset();
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Something went wrong. Please try again.";
      setStatus({ state: "error", message });
    }
  };

  const disabled = status.state === "submitting";

  if (status.state === "success") {
    return (
      <div className="cta-form-success" role="status">
        <span className="cta-form-success-mark" aria-hidden="true">
          ✓
        </span>
        <div>
          <p className="cta-form-success-title">Message sent</p>
          <p className="cta-form-success-subtitle">
            Thanks for reaching out. We'll get back to you shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form className="cta-form" onSubmit={onSubmit} aria-label="Contact us">
      <div className="cta-form-row">
        <input
          type="text"
          name="name"
          required
          placeholder="Your name"
          aria-label="Your name"
          disabled={disabled}
        />
        <input
          type="email"
          name="email"
          required
          placeholder="you@team.com"
          aria-label="Email address"
          disabled={disabled}
        />
      </div>
      <input
        type="text"
        name="company"
        placeholder="Company (optional)"
        aria-label="Company"
        disabled={disabled}
      />
      <textarea
        name="message"
        required
        placeholder="Your message..."
        aria-label="Message"
        rows={4}
        disabled={disabled}
      />
      {status.state === "error" && (
        <p className="cta-form-error" role="alert">
          {status.message}
        </p>
      )}
      <button
        type="submit"
        className="primary-action"
        disabled={disabled}
        aria-busy={disabled}
      >
        <span>{disabled ? "Sending…" : "Send message"}</span>
        <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}

export function LandingPage() {
  return (
    <main className="landing-page">
      <div className="announce">
        <span className="announce-tag">Alpha</span>
        <span className="announce-text">
          SynthAPI is in early access. Start building mocks today.
        </span>
        <a className="announce-link" href={signupUrl}>
          Get started <span aria-hidden="true">→</span>
        </a>
      </div>

      <header className="site-header">
        <Logo />
        <nav aria-label="Primary navigation">
          <a href={docsUrl}>Docs</a>
          <a href={signinUrl}>Sign in</a>
          <a className="header-cta" href={signupUrl}>
            Start free <span aria-hidden="true">→</span>
          </a>
        </nav>
      </header>

      <section className="hero">
        <p className="eyebrow">AI-native API simulation</p>
        <h1>Bring complex backend behaviors to life, instantly.</h1>
        <p className="hero-text">
          Standard mock servers fail when you need real-world state and complex
          logic. SynthAPI combines generative AI with powerful rule trees to
          build intelligent API replicas. Define your logic in plain English and
          ship production-ready mocks that keep your teams moving.
        </p>
        <div className="hero-actions">
          <a className="primary-action" href={signupUrl}>
            <span>Start building for free</span>
            <span aria-hidden="true">→</span>
          </a>
          <a className="secondary-action" href={docsUrl}>
            Read the docs
          </a>
        </div>
        <HeroSnippet />
      </section>

      <section className="features-overview">
        <h2>
          <span className="hash" aria-hidden="true"></span>What is SynthAPI?
        </h2>
        <p className="section-lead">
          SynthAPI is a mock API platform that thinks like a backend. Describe
          what you need, branch on real conditions, and keep state across calls.
        </p>
        <ul className="feature-list">
          {heroFeatures.map((feature) => (
            <li key={feature.id} className="feature-list-item">
              <span className="feature-bullet" aria-hidden="true">
                [*]
              </span>
              <div className="feature-list-body">
                <span className="feature-list-title">{feature.label}</span>
                <span className="feature-list-desc">{feature.heroText}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="feature-sections">
        {heroFeatures.map((feature) => (
          <section key={feature.id} className="feature-section" id={feature.id}>
            <div className="feature-copy">
              <h2 className="feature-title">
                <span className="feature-title-icon" aria-hidden="true">
                  {feature.icon}
                </span>
                {feature.title}
              </h2>
              <div className="feature-body">
                {(feature.detailParagraphs ?? [feature.heroText]).map(
                  (paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ),
                )}
              </div>
              <div className="feature-tags">
                {feature.tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
              <a href={signupUrl} className="link-arrow">
                Learn more <span aria-hidden="true">→</span>
              </a>
            </div>
            <div className="feature-viz">
              {feature.ruleTree ? (
                <RuleTreeDiagram tree={feature.ruleTree} />
              ) : feature.chat ? (
                <ChatDiagram messages={feature.chat} />
              ) : feature.stateTimeline ? (
                <StateTimelineDiagram steps={feature.stateTimeline} />
              ) : feature.workspace ? (
                <WorkspaceDiagram workspace={feature.workspace} />
              ) : (
                <FeatureCodeTile lines={feature.code} />
              )}
            </div>
          </section>
        ))}
      </div>

      <section className="faq-section">
        <h2>
          <span className="hash" aria-hidden="true"></span>
          FAQ
        </h2>
        <ul className="faq-list">
          {faqs.map((faq) => (
            <FaqItem key={faq.question} q={faq.question} a={faq.answer} />
          ))}
        </ul>
      </section>

      <section className="cta-section">
        <h2>
          <span className="hash" aria-hidden="true">
            #
          </span>
          Reach out
        </h2>
        <p className="cta-subtitle">
          Building something and want a hand, or just have a question? Tell us
          what you're working on and we'll get back to you.
        </p>
        <ContactForm endpoint={contactUrl} />
      </section>

      <footer className="site-footer">
        <div className="footer-brand">
          <Logo />
          <p className="footer-tag">Realistic mock APIs for builders.</p>
        </div>
        <nav className="footer-nav" aria-label="Footer">
          <a href={docsUrl}>Docs</a>
          <a href={signinUrl}>Sign in</a>
          <a href={signupUrl}>Start free</a>
        </nav>
        <p className="footer-meta">
          ©{new Date().getFullYear()} SynthAPI · Alpha
        </p>
      </footer>
    </main>
  );
}
