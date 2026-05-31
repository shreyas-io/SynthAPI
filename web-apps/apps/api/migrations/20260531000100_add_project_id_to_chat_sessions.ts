import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table chat_sessions
    add column project_id uuid not null references projects(id);

    create index idx_chat_sessions_project_id on chat_sessions(project_id);
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    drop index if exists idx_chat_sessions_project_id;

    alter table chat_sessions
    drop column if exists project_id;
  `.execute(db);
}
