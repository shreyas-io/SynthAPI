import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    create table mock_api_responses (
      id uuid primary key default uuidv7(),
      mock_api_id uuid not null references mock_apis(id) on delete cascade,
      label VARCHAR(64) not null,
      response jsonb not null,
      rule_tree jsonb,
      post_response_actions jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create index mock_api_responses_mock_api_id_index on mock_api_responses(mock_api_id);

    create trigger set_mock_api_responses_updated_at
    before update on mock_api_responses
    for each row
    execute function set_updated_at();
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    drop trigger if exists set_mock_api_responses_updated_at on mock_api_responses;
    drop table if exists mock_api_responses;
  `.execute(db);
}
