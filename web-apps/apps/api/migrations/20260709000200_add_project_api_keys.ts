import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    create table key_encryption_keys (
      id uuid primary key default uuidv7(),
      key_name varchar(255) not null unique,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table data_encryption_keys (
      id uuid primary key default uuidv7(),
      key_encryption_key_id uuid not null references key_encryption_keys(id),
      algorithm varchar(64) not null,
      encrypted_key text not null,
      iv text not null,
      auth_tag text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table project_api_keys (
      id uuid primary key default uuidv7(),
      project_id uuid not null references projects(id) on delete cascade,
      data_encryption_key_id uuid not null references data_encryption_keys(id),
      name varchar(100) not null,
      key_prefix varchar(32) not null,
      key_suffix varchar(16) not null,
      encrypted_key text not null,
      iv text not null,
      auth_tag text not null,
      created_by_user_id uuid references users(id) on delete set null,
      deleted_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create index data_encryption_keys_kek_id_idx
    on data_encryption_keys(key_encryption_key_id);

    create index project_api_keys_project_id_idx
    on project_api_keys(project_id);

    create index project_api_keys_active_project_id_idx
    on project_api_keys(project_id)
    where deleted_at is null;

    create index project_api_keys_dek_id_idx
    on project_api_keys(data_encryption_key_id);

    create trigger key_encryption_keys_set_updated_at
    before update on key_encryption_keys
    for each row
    execute function set_updated_at();

    create trigger data_encryption_keys_set_updated_at
    before update on data_encryption_keys
    for each row
    execute function set_updated_at();

    create trigger project_api_keys_set_updated_at
    before update on project_api_keys
    for each row
    execute function set_updated_at();
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    drop trigger if exists project_api_keys_set_updated_at on project_api_keys;
    drop trigger if exists data_encryption_keys_set_updated_at on data_encryption_keys;
    drop trigger if exists key_encryption_keys_set_updated_at on key_encryption_keys;

    drop table if exists project_api_keys;
    drop table if exists data_encryption_keys;
    drop table if exists key_encryption_keys;
  `.execute(db);
}
