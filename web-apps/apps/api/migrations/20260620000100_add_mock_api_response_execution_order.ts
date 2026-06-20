import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table mock_api_responses
    add column execution_order integer not null default 0
  `.execute(db);

  await sql`
    with ordered_responses as (
      select id, row_number() over (partition by mock_api_id order by created_at asc) as rn
      from mock_api_responses
    )
    update mock_api_responses
    set execution_order = ordered_responses.rn
    from ordered_responses
    where mock_api_responses.id = ordered_responses.id
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table mock_api_responses
    drop column if exists execution_order
  `.execute(db);
}
