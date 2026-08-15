# Code Review: `agent_config` and `pricing` refactoring

## Context
This change refactors the agent configuration and pricing logic:
1. Moves AI pricing constants (`credits_per_usd`, etc.) into a new `plan_ai_usage_prices` DB table.
2. Replaces the `agent_configs` table (and its JSON-based migration seeder) with a singleton `agent_runtime_config` DB table and a `loadAgentConfig` getter.
3. Removes `agent_config_id` from `chat_sessions`.

## Findings

### Correctness

**1. Missing Runtime Schema Validation for JSON Configurations**
*Severity: Required*
In `config.ts`, `loadAgentConfig` fetches `row.agent_config` and parses it with `JSON.parse()`, then casts it to `AgentModelConfig`. There is no runtime validation (e.g., via `zod`) to ensure the DB JSON matches the TS interface. If a malformed configuration is inserted into the DB, it will cause downstream `TypeError`s (e.g., missing properties). 
*Plan:* Add a `zod` schema for `AgentConfig` and use `schema.parse()` instead of raw type casting.

**2. Stale Documentation**
*Severity: Nit*
`.skills/synthapi-api-analysis/references/api-overview.md` still lists `runs agent config migrations` in the boot sequence, but `runAgentConfigMigrations` was deleted from `server.ts`.
*Plan:* Remove the stale text from `api-overview.md`.

### Readability & Simplicity

**3. Misleading Function Name: `roundCredits`**
*Severity: Nit*
In `agent_chat/index.ts`, `roundCredits` was updated to accept `min_credit_charge` and apply a floor (`Math.max(rounded, min_credit_charge)`). The name implies only rounding.
*Plan:* Rename `roundCredits` to `applyMinimumCharge` or `roundAndFloorCredits`.

### Architecture

**4. Generic `Error` Thrown Instead of Domain Exception**
*Severity: Optional / Consider*
Both `config.ts` and `pricing.ts` throw `new Error(...)` when configurations are missing. In the agent orchestration domain, it's better to throw an `AgentOrchestrationException` (or equivalent domain/TRPC error) so that the API returns a structured HTTP error (e.g., 500 or Precondition Failed) rather than crashing or returning an unhandled generic 500.
*Plan:* Replace `throw new Error(...)` with the appropriate domain exception.

**5. Multiple Concerns in One Diff**
*Severity: Optional / Consider*
Moving pricing configuration to a new table (`plan_ai_usage_prices`) and overhauling the `agent_configs` architecture into `agent_runtime_config` are two distinct logical changes. 
*Plan:* If this is submitted as a single PR, consider splitting it into two separate PRs to make review and potential rollbacks safer, as per the `code-review-and-quality` skill guidelines.

### Performance

**6. Extra DB Round-Trips on Hot Paths**
*Severity: Optional / Consider*
- `loadAgentConfig(ctx)` performs a DB query to `agent_runtime_config` every time it's called.
- `getPlanAiPricingForOrganization` performs a DB query every time credit usage is recorded.
Since these configurations change infrequently, fetching them on every chat turn adds unnecessary DB latency.
*Plan:* If these are invoked on the hot path (e.g. inside `runTurn`), consider caching the results with a short TTL or fetching them once at the start of the session.

### Security
No vulnerabilities found. Parameterized queries and explicit limits are used.

## Verification
- [ ] Tests updated to reflect the removal of `agent_config_id` from `chat_sessions`.
- [ ] Zod schema added for `agent_runtime_config` validation.

## Verdict
**Request changes** — The missing runtime validation (Correctness #1) should be addressed to prevent DB configuration errors from crashing the agent loop.
