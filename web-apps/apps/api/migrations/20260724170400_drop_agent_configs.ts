import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table chat_sessions drop constraint if exists chat_sessions_agent_config_id_fkey;
    drop index if exists chat_sessions_agent_config_id_idx;
    alter table chat_sessions drop column if exists agent_config_id;
    drop trigger if exists agent_configs_set_updated_at on agent_configs;
    drop table if exists agent_configs;
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Irreversible migration
  console.warn("Migration down for drop_agent_configs is a no-op.");
}
