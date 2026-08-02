import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table projects
    add column slug varchar(255);
  `.execute(db);

  await sql`
    update projects
    set slug = 'project-' || replace(id::text, '-', '')
    where slug is null;
  `.execute(db);

  await sql`
    alter table projects
    alter column slug set not null;
  `.execute(db);

  await sql`
    create unique index projects_slug_unique_index on projects(slug);
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    drop index if exists projects_slug_unique_index;
  `.execute(db);

  await sql`
    alter table projects
    drop column if exists slug;
  `.execute(db);
}
