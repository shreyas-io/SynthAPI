import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table agent_configs
    drop column if exists planning_config,
    drop column if exists chat_fallback_config;
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table agent_configs
    add column chat_fallback_config jsonb not null default '{}'::jsonb,
    add column planning_config jsonb not null default '{}'::jsonb;
  `.execute(db);
}
