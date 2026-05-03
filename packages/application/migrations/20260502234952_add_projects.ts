import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    create table projects (
      id uuid primary key default uuidv7(),
      name text not null,
      description text not null,
      globals jsonb not null default '[]'::jsonb,
      constants jsonb not null default '[]'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create trigger set_projects_updated_at
    before update on projects
    for each row
    execute function set_updated_at();
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    drop trigger if exists set_projects_updated_at on projects;
    drop table if exists projects;
  `.execute(db);
}
