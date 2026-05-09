import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table mock_api_responses
    add column is_default boolean not null default false
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table mock_api_responses
    drop column if exists is_default
  `.execute(db);
}
