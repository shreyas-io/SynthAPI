---
title: 'Introduction'
description: 'Welcome to SynthAPI'
---

# What is SynthAPI?

**SynthAPI** is a stateful mock API platform. You build a project, add mock APIs, and configure one or more ordered responses for each API. Every response can decide when it should match, what it should return, and what state it should mutate after the response is sent.

That gives you enough control to model more than static fixtures:

- Protected endpoints with `401` or `403` branches
- CRUD flows backed by mutable project state
- Validation failures before the success case
- Streaming APIs over Server-Sent Events
- Response payloads computed at runtime with `json_script`

## How the platform is organized

At runtime, the platform model is:

1. **Project**: a workspace containing variables, constants, and APIs
2. **Mock API**: an HTTP method and path such as `GET /posts` or `POST /v1/chat/completions/stream`
3. **Response**: a candidate outcome for that API, evaluated in order
4. **Rule Tree**: the matching logic for a response
5. **Post-Response Actions**: the state changes that run after that response is served

## What to read next

- **[Quickstart](/quickstart)** for the shortest path through the product
- **[Platform Overview](/platform-overview/)** for the core UI and mental model
- **[Blog CRUD API walkthrough](/examples/blog-crud-api)** for a full stateful REST example
- **[LLM SSE Events walkthrough](/examples/llm-sse-events)** for a streaming example
- **[Agent Capabilities](/agent/capabilities)** for the AI-assisted authoring workflow
