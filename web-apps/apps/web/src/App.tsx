import { useEffect, useState } from "react";

import {
  getBootstrapData,
  type GreetingResponse,
  type HealthResponse,
} from "./api";
import "./index.css";

type LoadState =
  | { status: "loading" }
  | {
      status: "ready";
      health: HealthResponse;
      greeting: GreetingResponse;
    }
  | {
      status: "error";
      message: string;
    };

export default function App() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    void getBootstrapData()
      .then(({ health, greeting }) => {
        if (!cancelled) {
          setState({
            status: "ready",
            health,
            greeting,
          });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "The frontend could not reach the backend worker.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Cloudflare UI, AWS API</p>
        <h1>
          React on Cloudflare, backed by Express and a DI-driven application
          package.
        </h1>
        <p className="lede">
          This frontend is deployed as a Cloudflare SPA and calls the AWS-hosted
          API directly over HTTPS.
        </p>
      </section>

      <section className="panel-grid">
        <article className="panel">
          <span className="panel-label">Frontend status</span>
          <h2>Worker bootstrap</h2>
          <p>
            Vite builds the SPA, Cloudflare serves the assets, and the app
            probes the Express backend during startup.
          </p>
        </article>

        <article className="panel">
          <span className="panel-label">Backend status</span>
          <h2>Live API check</h2>
          {state.status === "loading" && (
            <p>Contacting the backend worker...</p>
          )}
          {state.status === "error" && <p className="error">{state.message}</p>}
          {state.status === "ready" && (
            <>
              <p>{state.greeting.message}</p>
              <dl className="facts">
                <div>
                  <dt>Health</dt>
                  <dd>{state.health.status}</dd>
                </div>
                <div>
                  <dt>Timestamp</dt>
                  <dd>{state.health.timestamp}</dd>
                </div>
                <div>
                  <dt>Target</dt>
                  <dd>{state.greeting.target}</dd>
                </div>
              </dl>
            </>
          )}
        </article>
      </section>
    </main>
  );
}
