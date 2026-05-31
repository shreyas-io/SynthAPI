import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table agent_configs
    add column version integer not null default 1;
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table agent_configs
    drop column if exists version;
  `.execute(db);
}
