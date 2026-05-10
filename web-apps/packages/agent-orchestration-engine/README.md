# Agent Orchestration Engine Package

`packages/agent-orchestration-engine` contains the agent orchestration backend logic.
It is consumed by the API server through dependency injection.

The package is split into layers:

- `sdk`: presentation layer. DTOs and handlers live here.
- `domain`: application/domain types, usecases, and interfaces.
- `infrastructure`: concrete adapters such as Kysely repositories.

The domain layer must not import from `sdk`. SDK can validate and translate
input, then call domain usecases.

## Persistence Pattern

When adding a new table, keep these responsibilities separate.

### Entities

Domain entities live in `src/domain/entities`.

Entities describe the shape the application works with, not the database API.
Use database-style field names only when that is already the domain convention
for the package, for example `created_at` and `updated_at`.

### Repository Interfaces

Repository contracts live in `src/domain/entities/interfaces`.

The interface defines what the domain needs. It should not mention Kysely,
tables, SQL, or infrastructure details.

### Kysely Models

Kysely table models live in `src/infrastructure/kysely/models`.

Models describe database tables for Kysely.

Add every table to the central `Database` type in
`src/infrastructure/kysely/index.ts`.

### Kysely Repositories

Repository implementations live in
`src/infrastructure/kysely/repositories/<resource>`.

Use one file per operation when the repository has meaningful behavior:

```txt
repositories/<resource>/
  create.ts
  list.ts
  update.ts
  delete.ts
  index.ts
```

The folder `index.ts` returns the repository object.

## New Table Checklist

1. Add or update the migration for the table.
2. Add the domain entity in `src/domain/entities`.
3. Add the repository interface in `src/domain/entities/interfaces`.
4. Add the Kysely model in `src/infrastructure/kysely/models`.
5. Add the table to `Database` in `src/infrastructure/kysely/index.ts`.
6. Add repository operation files under `src/infrastructure/kysely/repositories/<resource>`.
7. Add the repository factory in that folder's `index.ts`.
8. Wire the repository into the relevant domain usecase.
9. Expose behavior through the SDK handler if needed.
10. Run `pnpm --filter @mock-stack/agent-orchestration-engine run typecheck`.
11. Run `pnpm --filter @mock-stack/agent-orchestration-engine run build`.

## Import Rules

- Do not use `src/index.ts` as a barrel for internal domain or infrastructure code.
- Import directly from the file that owns the type or function.
- Domain can depend on domain.
- Infrastructure can depend on domain contracts and entities.
- SDK can depend on DTOs and domain usecases.
- Domain must not depend on SDK or infrastructure.
