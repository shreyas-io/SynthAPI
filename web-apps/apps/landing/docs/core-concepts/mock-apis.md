---
title: 'Mock APIs & Responses'
description: 'Understanding how SynthAPI matches paths and returns conditional data'
---

## Matching Logic

SynthAPI routes incoming requests using:
1. HTTP Method
2. Path Match (supports Express-style parameters like `:id`)
3. Query Key matches

If multiple mock APIs match the requested route, the engine prioritizes:
1. More configured query keys
2. More static path segments over dynamic (`:id`) ones
3. Longer paths

## Responses

A single Mock API can have **multiple responses**. You define which response is returned using **Rule Trees**.

The response editor in the platform is organized around three tabs:

- `Response`: what gets returned to the caller
- `Actions`: what mutates after the response is sent
- `Rules`: when that response should match

See **[Platform Overview](/platform-overview/)** for the UI walkthrough and screenshots.

### Rule Trees
A Rule Tree is a set of logical conditions (`AND` / `OR`) containing **Predicates**.

A predicate checks a specific value in the request against an expected value. Examples of checks you can run:
- Is <code v-pre>{{request.headers.authorization}}</code> set?
- Does <code v-pre>{{request.body.value.email}}</code> equal `test@example.com`?
- Does the request body match a specific **JSON Schema**?

### The Default Response
Every Mock API typically has a **Default Response** that executes if no conditional Rule Trees pass.

### Execution Order
Responses are evaluated in order. You can drag and drop responses in the SynthAPI UI (or ask the Agent) to adjust the sequence in which predicates are tested. As soon as a response's rule tree evaluates to `true`, that response is served and evaluation stops.

In practice, place your narrow failure branches first, then keep the default success branch last. The **[Responses and Ordering](/platform-overview/responses-and-ordering)** page shows this with the seeded Blog CRUD and Mock LLM examples.
