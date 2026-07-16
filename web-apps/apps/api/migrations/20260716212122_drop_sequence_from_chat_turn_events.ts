import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table chat_turn_events drop constraint if exists chat_turn_events_turn_sequence_unique;
    alter table chat_turn_events drop column sequence;
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table chat_turn_events add column sequence integer;
    alter table chat_turn_events add constraint chat_turn_events_turn_sequence_unique unique (chat_turn_id, sequence);
  `.execute(db);
}
