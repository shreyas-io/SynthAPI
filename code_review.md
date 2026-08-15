# Code Review: `feat/move-pricing-config-to-db`

**Branch:** `feat/move-pricing-config-to-db`
**Commit:** `2980ee0 — chore: move pricing config to db`
**Diff size:** 24 files, +236 / −625 lines (net deletion — good)

## Context

This change does two things in a single commit:

1. **Moves AI pricing constants** (`credits_per_usd`, `min_credit_charge`, `web_search_cost_usd`) from hardcoded values in the agent chat use case into a new `plan_ai_usage_prices` DB table, resolved per-organization via their active plan subscription.
2. **Removes the `agent_configs` table** and all associated code (entity, use case, DTO, migration runner, JSON migration files, Dockerfile copy step, DB model). The `AgentConfig` is now a static in-memory object in `domain/configs/agent-config/config.ts`.

---

## Findings

### Correctness

#### 1. Stale documentation still references removed boot step
**Severity: Required**

`.skills/synthapi-api-analysis/references/api-overview.md` line 17 still says:

> Boot: loads secrets, creates DB client, runs DB migrations, starts Redis KV, starts a Pyodide pool, creates an in-memory event bus, starts BullMQ domain jobs, **runs agent config migrations**, then mounts Express middleware/routes.

The `runAgentConfigMigrations` call was removed from `server.ts`. The docs should be updated to remove the "runs agent config migrations" phrase.

**Plan:** Edit `.skills/synthapi-api-analysis/references/api-overview.md` line 17 to remove "runs agent config migrations, " from the boot sequence description.

---

#### 2. Migration seeds identical pricing for all plan types
**Severity: Optional / Consider**

`20260815120000_add_plan_ai_usage_prices.ts` lines 22-26 seeds **all** plan types with the same values:

```sql
insert into plan_ai_usage_prices (plan_type_id, credits_per_usd, min_credit_charge, web_search_cost_usd)
select id, 4000, 0.01, 0.008
from plan_types;
```

Existing plan types include `basic` and `plus` (from prior migrations). If these plans are meant to have different pricing economics, seeding them identically will require a follow-up migration. This is fine as an initial step if the intent is to differentiate later, but worth noting since the whole point of moving to a DB table is per-plan configurability.

**Plan:** No code change needed. Add a comment in the migration clarifying that uniform seeding is intentional and per-plan differentiation is planned for a follow-up, or seed distinct values now if they are already known.

---

#### 3. Pricing query does not filter on subscription status thoroughly
**Severity: Optional / Consider**

In `pricing.ts` line 40, the active-subscription query filters on `status = 'active'` but does not order or limit results. If an organization has multiple active subscriptions (e.g., a data anomaly or overlapping plan transitions), `executeTakeFirst()` will return whichever row the DB happens to pick, which is nondeterministic.

**Plan:** Add `.orderBy("organization_plan_subscriptions.created_at", "desc").limit(1)` to the active pricing query, so the most recent subscription wins. Alternatively, add a unique constraint at the DB level ensuring only one active subscription per organization if that invariant should be enforced.

---

#### 4. `recordCreditUsage` makes an extra DB round-trip per turn
**Severity: Nit**

`agent_chat/index.ts` lines 129-132 calls `getPlanAiPricingForOrganization` every time credit usage is recorded. Since pricing changes infrequently, this could be cached for the duration of a chat turn or even per agent-chat instance.

**Plan:** No immediate change required. If profiling shows this is a bottleneck, consider caching `PlanAiPricing` on the `AgentChatUsecase` closure with a TTL, or resolving it once at the start of `runTurn` and passing it through.

---

### Readability & Simplicity

#### 5. `roundCredits` now takes `min_credit_charge` as a parameter but the name doesn't convey a floor
**Severity: Nit**

`agent_chat/index.ts` lines 87-90:

```typescript
const roundCredits = (min_credit_charge: number, credits: number): number => {
  const rounded = Math.round(credits * 100) / 100;
  return Math.max(rounded, min_credit_charge);
};
```

The function name `roundCredits` suggests rounding, but it also applies a floor. A name like `roundCreditsWithFloor` or `applyMinimumCharge` would make the dual behavior self-documenting.

**Plan:** Rename `roundCredits` to `applyMinimumCharge` or `roundAndFloorCredits`, and update the two call sites.

---

#### 6. Session existence check improvement is good
**Severity: FYI**

The change from `count(*)::int` to a `select("id") + executeTakeFirst()` pattern in `agent_chat/index.ts` lines 206-210 is a clean simplification — it removes an unnecessary `sql` template literal import and is more idiomatic Kysely. No action needed.

---

### Architecture

#### 7. Two concerns in one commit: pricing migration + agent_configs removal
**Severity: Required**

The commit message is `chore: move pricing config to db` but the change also performs a complete removal of the `agent_configs` table, entity, use case, DTO, migration runner, JSON migration files, and Dockerfile step. These are two distinct logical changes:

1. Add `plan_ai_usage_prices` table and wire it into credit billing.
2. Drop `agent_configs` and all its infrastructure.

Per the review skill's guidance: *"Separate refactoring from feature work. A change that refactors existing code and adds new behavior is two changes — submit them separately."* These should ideally be two commits (at minimum) or two PRs for independent review and safer rollback.

**Plan:** Split into two commits:
- **Commit 1:** Add `plan_ai_usage_prices` table, migration, Kysely model, `pricing.ts` use case, and update `agent_chat/index.ts` to use DB-driven pricing.
- **Commit 2:** Drop `agent_configs` table, remove entity/use case/DTO/migration runner/JSON files/Dockerfile line, remove `agent_config_id` from `chat_sessions`.

---

#### 8. Commit message lacks body / rationale
**Severity: Required**

The commit message is:
```
chore: move pricing config to db
```

No body. The skill's guidance says: *"Body: What is changing and why. Include context, decisions, and reasoning not visible in the code itself."* This change is significant (dropping an entire table, restructuring billing) and deserves a body explaining:
- Why `agent_configs` is being removed (replaced by static in-memory config).
- Why pricing is moving to the DB (per-plan differentiation).
- What's left unchanged (token-level model pricing remains in `AgentConfig`).

**Plan:** Amend the commit message to include a body with the rationale above. If splitting into two commits per finding #7, each gets its own descriptive message.

---

#### 9. `pricing.ts` throws a generic `Error` instead of a domain exception
**Severity: Optional / Consider**

`pricing.ts` line 57:

```typescript
throw new Error("Plan AI pricing is not configured.");
```

The rest of the agent orchestration domain uses `AgentOrchestrationException` with proper HTTP status codes. A generic `Error` here will likely result in a 500 to the client. Consider using a domain-specific exception with `PRECONDITION_FAILED` or `INTERNAL_SERVER_ERROR` and a clear `public_message`.

Similarly, `agent_chat/index.ts` line 126:

```typescript
throw new Error("Agent model pricing is not configured.");
```

**Plan:** Replace both `throw new Error(...)` with `throw new AgentOrchestrationException({ public_message: ..., status_code: HttpStatusCode.PRECONDITION_FAILED })` to match existing conventions.

---

### Security

No security issues found. This change doesn't introduce new input surfaces, secrets handling, or auth boundaries. The pricing resolution query uses parameterized Kysely queries — no injection risk.

---

### Performance

#### 10. No index on `plan_ai_usage_prices.plan_type_id` for join performance
**Severity: Nit**

The `plan_ai_usage_prices` table has a `unique` constraint on `plan_type_id`, which implicitly creates an index, so the join in `pricing.ts` is covered. No action needed — noting for completeness that this is already handled.

---

## Dead Code Check

| Item | Status |
|---|---|
| `AgentConfigsTable` type | ✅ Removed |
| `AgentConfigEt` entity | ✅ Removed |
| `agent_configs` use case (`upsertAgentConfig`, `getAgentConfigByKey`, `getEnabledAgentConfigs`) | ✅ Removed |
| `createChatSessionDto` (DTO referencing `agent_config_id`) | ✅ Removed |
| `createChatSessionWithDefaultAgentConfig` method | ✅ Removed |
| `agent_config_id` on `ChatSessionsTable` / `ChatSessionEt` / `ChatSession` (frontend type) | ✅ Removed |
| `agent_config_ids` filter on `listChatSessionsFilterDto` | ✅ Removed |
| `run_agent_config_migrations.ts` | ✅ Removed |
| `agent_config_migrations/` directory (5 JSON files) | ✅ Removed |
| Dockerfile `COPY agent_config_migrations` | ✅ Removed |
| `langchain_llm.ts` — parameter name `agent_config` | ⚠️ Local parameter name for in-memory config, not stale. Acceptable. |
| `.skills/.../api-overview.md` — "runs agent config migrations" | ❌ **Stale** — see finding #1 |

---

## Verification Checklist

- [ ] Tests pass
- [ ] Build succeeds
- [ ] Migration runs cleanly (up and down) against current DB state
- [ ] Existing chat sessions still function without `agent_config_id`

---

## Summary of Fix Plan

| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| 1 | Required | Stale docs reference to removed boot step | Edit `api-overview.md` line 17 |
| 2 | Optional | Uniform pricing seed for all plan types | Add clarifying comment or seed distinct values |
| 3 | Optional | Active pricing query nondeterministic with multiple subscriptions | Add `orderBy` + `limit(1)` |
| 4 | Nit | Extra DB round-trip per credit recording | Consider caching if profiled as bottleneck |
| 5 | Nit | `roundCredits` name doesn't convey floor behavior | Rename to `applyMinimumCharge` |
| 6 | FYI | Session existence check simplification | No action needed |
| 7 | Required | Two logical changes in one commit | Split into two commits |
| 8 | Required | Commit message lacks body/rationale | Amend with explanatory body |
| 9 | Optional | Generic `Error` instead of domain exception | Use `AgentOrchestrationException` |
| 10 | Nit | Index on `plan_type_id` | Already covered by unique constraint |

### Verdict: **Request Changes** — Three required items (stale docs, commit splitting, commit message) must be addressed before merge.
