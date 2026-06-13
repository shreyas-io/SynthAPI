import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table projects
    add column deleted_by_user_id uuid references users(id);
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table projects
    drop column if exists deleted_by_user_id;
  `.execute(db);
}
