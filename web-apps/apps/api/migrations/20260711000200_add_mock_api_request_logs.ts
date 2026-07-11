import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table plan_types
    add column max_request_logs integer not null default 1000;
  `.execute(db);

  await sql`
    update plan_types set max_request_logs = 1000 where key = 'basic';
    update plan_types set max_request_logs = 25000 where key = 'plus';
  `.execute(db);

  await sql`
    create table mock_api_request_logs (
      id uuid primary key default gen_random_uuid(),
      project_id uuid not null references projects(id) on delete cascade,
      mock_api_id uuid references mock_apis(id) on delete set null,
      method text not null,
      url text not null,
      request_headers jsonb not null,
      request_body text,
      response_status integer not null,
      response_headers jsonb not null,
      response_body text,
      created_at timestamp with time zone not null default now()
    );
  `.execute(db);

  await sql`
    create index idx_mock_api_request_logs_project_id_created_at 
    on mock_api_request_logs(project_id, created_at desc);
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`drop table mock_api_request_logs`.execute(db);
  await sql`alter table plan_types drop column max_request_logs`.execute(db);
}
