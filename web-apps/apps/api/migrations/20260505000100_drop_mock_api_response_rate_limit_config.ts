import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table mock_api_responses
    drop column if exists rate_limit_config;
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table mock_api_responses
    add column rate_limit_config jsonb;
  `.execute(db);
}
