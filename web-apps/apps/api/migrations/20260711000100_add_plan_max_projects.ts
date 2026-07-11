import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table plan_types
    add column max_projects integer not null default 3;
  `.execute(db);

  await sql`
    update plan_types set max_projects = 10 where key = 'basic';
    update plan_types set max_projects = 50 where key = 'plus';
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table plan_types
    drop column max_projects;
  `.execute(db);
}
