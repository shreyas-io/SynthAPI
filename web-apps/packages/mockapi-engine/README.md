# Mock API Engine Package

`packages/mockapi-engine` contains the backend application logic. It is consumed by
the API server through dependency injection.

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

Example:

```ts
export type Project = {
  id: string;
  name: string;
  description: string;
  created_at: Date;
  updated_at: Date;
};

export type CreateProjectInput = Pick<Project, "name" | "description">;
export type UpdateProjectInput = CreateProjectInput;
```

Keep list/query helper types out of entities unless they are truly domain
concepts. Repository-specific filters, pagination, sorting, and selected-column
types should usually stay near the repository interface or implementation.

### Repository Interfaces

Repository contracts live in `src/domain/entities/interfaces`.

The interface defines what the domain needs. It should not mention Kysely,
tables, SQL, or infrastructure details.

Example:

```ts
export interface IProjectsRepository {
  create: (input: CreateProjectInput) => Promise<void>;
  list: {
    (filters: ProjectFilters, pagination: Pagination, sort: ProjectSort): Promise<Project[]>;
    <Columns extends readonly ProjectColumn[]>(
      filters: ProjectFilters,
      pagination: Pagination,
      sort: ProjectSort,
      columns: Columns,
    ): Promise<Pick<Project, Columns[number]>[]>;
  };
  update: (id: string, input: UpdateProjectInput) => Promise<void>;
  delete: (id: string) => Promise<void>;
}
```

Guidelines:

- Mutations return `Promise<void>` unless the usecase explicitly needs returned data.
- Reads that are list-shaped should return lists, even when filtering by IDs.
- Optional column selection should be type-safe: no columns returns the full entity; provided columns return `Pick<Entity, Columns[number]>[]`.
- Keep selected-column overloads local and readable. Do not create extra helper files unless the abstraction is reused and improves clarity.

### Kysely Models

Kysely table models live in `src/infrastructure/kysely/models`.

Models describe database tables for Kysely. They should use domain types where
that keeps JSONB and structured fields aligned with the application.

Example:

```ts
import type { ColumnType } from "kysely";

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;

export type ProjectsTable = {
  id: ColumnType<string, string | undefined, never>;
  name: string;
  description: string;
  created_at: Timestamp;
  updated_at: Timestamp;
};
```

Add every table to the central `Database` type in
`src/infrastructure/kysely/index.ts`:

```ts
export type Database = {
  projects: ProjectsTable;
};
```

### Kysely Repositories

Repository implementations live in
`src/infrastructure/kysely/repositories/<resource>`.

Use one file per operation when the repository has meaningful behavior:

```txt
repositories/projects/
  create.ts
  list.ts
  update.ts
  delete.ts
  index.ts
```

The folder `index.ts` returns the repository object:

```ts
export const Projects = (client: DatabaseClient): IProjectsRepository => ({
  create: createProject(client),
  list: list(client),
  update: updateProject(client),
  delete: deleteProject(client),
});
```

Keep operation-local types in the operation file. For example, `ProjectFilters`,
pagination, sorting, column keys, and overloads for `list` should stay in
`list.ts` if only `list.ts` uses them.

Do not add extra `types.ts` files by default. Add one only when multiple files
need the same type and the extraction makes the code easier to read.

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
10. Run `pnpm --filter @mock-stack/mockapi-engine run typecheck`.
11. Run `pnpm --filter @mock-stack/mockapi-engine run build`.

## Import Rules

- Do not use `src/index.ts` as a barrel for internal domain or infrastructure code.
- Import directly from the file that owns the type or function.
- Domain can depend on domain.
- Infrastructure can depend on domain contracts and entities.
- SDK can depend on DTOs and domain usecases.
- Domain must not depend on SDK or infrastructure.

## Seeded Blog Mock API

`migrations/20260509000100_seed_blog_mock_api.ts` seeds a local demo project.
It runs through `migrate:latest`, so Docker startup creates it automatically.
The seed bypasses repositories and writes directly with Kysely SQL.
Idempotency is based on fixed UUIDs and `on conflict (id) do nothing`.
`20260509000300_mark_seed_blog_default_response.ts` marks the default response.
The seeded project slug is `realistic-blog-api-seed`.
It contains one public mock route: `POST /posts`.
The route has success, validation-error, and unauthorized responses.
Response selection uses rule trees with request header/body predicates.
The success rule also includes a child `or` node for content-type handling.
Post-response actions update local/global variables after execution.
Actions demonstrate `increment`, `set`, `append`, and `script`.
The migration `down` deletes the fixed project ID and cascades seeded data.
