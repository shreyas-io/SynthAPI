import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

// Ensure to call this before importing any other modules!
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [
    nodeProfilingIntegration(),
    Sentry.pinoIntegration(),
  ],
  // Tracing
  tracesSampleRate: 1.0, 
  
  // Profiling
  profilesSampleRate: 1.0,

  // Enable sending info/debug logs to Sentry's Logs product
  enableLogs: true,
});
