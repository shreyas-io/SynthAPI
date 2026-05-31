import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table chat_sessions
    add column name varchar(255) not null default '',
    add column description varchar(2048);
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table chat_sessions
    drop column if exists description,
    drop column if exists name;
  `.execute(db);
}
