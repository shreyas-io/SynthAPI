import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table agent_configs
    add column compaction_config jsonb,
    add column compaction_threshold_tokens integer;
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table agent_configs
    drop column if exists compaction_threshold_tokens,
    drop column if exists compaction_config;
  `.execute(db);
}
