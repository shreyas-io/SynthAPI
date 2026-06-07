import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table projects
    add column deleted_at timestamptz;

    alter table mock_apis
    add column deleted_at timestamptz;

    alter table mock_api_responses
    add column deleted_at timestamptz;

    create index projects_deleted_at_idx on projects(deleted_at);
    create index mock_apis_deleted_at_idx on mock_apis(deleted_at);
    create index mock_api_responses_deleted_at_idx on mock_api_responses(deleted_at);
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    drop index if exists mock_api_responses_deleted_at_idx;
    drop index if exists mock_apis_deleted_at_idx;
    drop index if exists projects_deleted_at_idx;

    alter table mock_api_responses
    drop column if exists deleted_at;

    alter table mock_apis
    drop column if exists deleted_at;

    alter table projects
    drop column if exists deleted_at;
  `.execute(db);
}
