import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table projects
    add column if not exists created_by_user_id uuid references users(id);
  `.execute(db);

  await sql`
    update projects
    set created_by_user_id = organizations.created_by_user_id
    from organizations
    where projects.organization_id = organizations.id
      and projects.created_by_user_id is null;
  `.execute(db);

  await sql`
    alter table projects
    alter column created_by_user_id set not null;
  `.execute(db);

  await sql`
    create index if not exists projects_created_by_user_id_idx on projects(created_by_user_id);
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    drop index if exists projects_created_by_user_id_idx;

    alter table projects
    drop column if exists created_by_user_id;
  `.execute(db);
}
