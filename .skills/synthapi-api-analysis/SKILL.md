---
name: synthapi-api-analysis
description: Analyze the SynthAPI backend in web-apps/apps/api, including functionality, route/use-case boundaries, public mock execution, agent chat orchestration, database entities, and Mermaid architecture or ER diagrams. Use when Codex is asked to explain, document, update, or reason about the API package, its data flow, models, or runtime behavior.
---

# SynthAPI API Analysis

## Workflow

1. Inspect source of truth before answering:
   - Route layer: `web-apps/apps/api/src/presentation/`
   - Domain use cases: `web-apps/apps/api/src/domain/usecases/`
   - Entity types: `web-apps/apps/api/src/domain/entities/`
   - Kysely models: `web-apps/apps/api/src/infrastructure/kysely/models/`
   - Migrations: `web-apps/apps/api/migrations/`
   - App bootstrap: `web-apps/apps/api/src/server.ts`
2. Ignore `dist/` unless the user explicitly asks about built output.
3. For functionality analysis, group behavior by product surface: auth/profile, organizations/plans/credits, projects, mock APIs, mock responses, public mock execution, and agent chat.
4. For data-flow/model analysis, trace request flow through presentation routes, middleware, use cases, persistence, Redis/KV, Pyodide, LLM providers, and BullMQ jobs.
5. Include Mermaid diagrams when requested. Prefer one flowchart for runtime behavior and one ER diagram for persisted entities.
6. Call out schema/code mismatches when found, especially migration gaps versus current TypeScript entity/DTO expectations.

## Reference

Read `references/api-overview.md` when the task asks for existing API functionality, data flow, entity diagrams, or a starting architecture summary. Treat it as a snapshot: verify against current files before making claims or editing docs because this package is actively evolving.
