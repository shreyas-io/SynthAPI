---
title: 'Request Logs'
description: 'How to monitor and debug API requests'
---

When building complex mock APIs—especially those with stateful rule trees, templates, and post-response actions—it's essential to understand exactly what happened during a request. SynthAPI's **Request Logs** feature provides full transparency into the execution pipeline.

## Viewing Logs

Every time a mock API receives a request, the SynthAPI engine logs the transaction. To view these logs:

1. Navigate to your **Project Dashboard**.
2. Click the **Request Logs** button.
3. You will see a chronological list of recent requests, including the timestamp, HTTP method, path, and the status code that was returned.

## Log Details

Clicking on a specific request log reveals deep diagnostic information to help you debug your configurations:

- **Request Data**: Inspect the exact headers, query parameters, path variables, and body payload that the engine received.
- **Evaluation Pipeline**: See exactly which rule tree branches succeeded or failed, and understand *why* the engine selected a particular response.
- **Response Data**: View the fully materialized response body and headers after any templates and Python `json_script` logic were executed.
- **State Mutations**: Review the post-response actions that were triggered and how they updated your project's Global or Local variables.

Using the Request Logs allows you to verify that your agent-driven mock APIs are behaving exactly as expected in edge cases and failure scenarios.
