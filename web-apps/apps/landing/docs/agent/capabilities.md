---
title: 'Agent Capabilities'
description: 'How to use the SynthAPI Agent'
---

SynthAPI features a built-in AI agent capable of orchestrating complex mock API setups so you don't have to manually configure rule trees, templates, or post-response actions.

## What the Agent Can Do

- **Generate Scenarios**: "Create a mock that fails the first two times with a 500, but succeeds on the 3rd attempt."
- **Manage Auth flows**: "Set up a login endpoint that returns a token, and a protected endpoint that checks for that token."
- **Data Collections**: "Create endpoints to list, add, and delete items from an array."
- **Rate Limiting**: "Create an endpoint that rate limits me to 5 requests."
- **Web Search Integration**: "Search the web for the latest GitHub API schema and build a mock based on it."

## Agent Safeguards & Limits

To ensure stable performance and protect against infinite loops, the agent's tool execution is strictly bounded. The agent is permitted up to **5 web searches per turn**, and is capped at 100 tool executions for all other actions within a single chat response.

## Tips for Prompting

1. **Be Specific about State**: Tell the agent if a variable should be global (shared across APIs) or local (specific to one API).
2. **Define the Negative Paths**: Always tell the agent what should happen when a rule fails (e.g., "Return a 400 Bad Request if the JSON schema doesn't match").
3. **Ask for Reorders**: If the execution sequence of responses seems incorrect, just ask the agent to reorder them!

## Behind the Scenes
The SynthAPI Agent uses a set of specific tools to interact directly with your project. It inspects existing APIs to prevent overwrites, evaluates execution logic, and configures the Mock engine safely and deterministically without injecting risky scripts.
