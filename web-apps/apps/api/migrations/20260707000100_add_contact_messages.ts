import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    create table contact_messages (
      id uuid primary key default uuidv7(),
      name varchar(255) not null,
      email varchar(255) not null,
      company varchar(255),
      message text not null,
      created_at timestamptz not null default now()
    );

    create index contact_messages_created_at_idx on contact_messages(created_at desc);
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    drop table if exists contact_messages;
  `.execute(db);
}