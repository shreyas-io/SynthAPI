import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    create table mock_apis (
      id uuid primary key default uuidv7(),
      project_id uuid not null references projects(id) on delete cascade,
      method text not null,
      path text not null,
      name text not null,
      description text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint mock_apis_project_method_path_unique unique (project_id, method, path)
    );

    create index mock_apis_project_id_index on mock_apis(project_id);

    create trigger set_mock_apis_updated_at
    before update on mock_apis
    for each row
    execute function set_updated_at();
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    drop trigger if exists set_mock_apis_updated_at on mock_apis;
    drop table if exists mock_apis;
  `.execute(db);
}
