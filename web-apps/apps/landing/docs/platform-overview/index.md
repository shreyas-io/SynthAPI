---
title: 'Platform Overview'
description: 'The core platform workflow from projects to responses'
---

# Platform Overview

SynthAPI is easiest to understand from the UI outward. You start with a project, open one of its APIs, and then configure the ordered responses that define runtime behavior.

## Projects and APIs

The Projects page is the top-level entry point. In the seeded workspace, you will typically see a stateful REST example and a streaming LLM example.

![Projects list showing the seeded example projects](../assets/projects.png)

Open a project to see its mock APIs.

![Blog CRUD project overview with the seeded APIs](../assets/blog-project.png)

Each API is a method and path pair. Examples from the seeded projects:

- `GET /posts`
- `POST /posts`
- `GET /posts/:id`
- `POST /v1/chat/completions`
- `POST /v1/chat/completions/stream`

## The response-centric workflow

Most work happens inside a response. A single mock API can have multiple possible responses, and each response answers three questions:

1. **What should be returned?**
2. **When should it match?**
3. **What state should change afterward?**

The UI exposes those questions as three tabs:

- `Response`
- `Actions`
- `Rules`

The selected response also shows its place in the response order and whether it is the default fallback.

![List Posts response editor showing ordered responses and a json_script body](../assets/blog-list-posts-response.png)

## Why the response list matters

The response strip on the left is not just navigation. It is the actual evaluation order used by the runtime.

- Responses are checked from top to bottom
- The first matching response wins
- A default response is the fallback when no earlier rule matches

That is why the seeded projects consistently place `Unauthorized` and validation failures before the success case.

## Next pages

- **[Responses and Ordering](/platform-overview/responses-and-ordering)** explains what a response contains and how matching order works.
- **[Rule Trees and Post-Response Actions](/platform-overview/rule-trees-and-post-actions)** explains the logic and mutation layers in detail.
