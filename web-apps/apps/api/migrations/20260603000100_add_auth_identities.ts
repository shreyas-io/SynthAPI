import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table users
      drop column username,
      drop column password_hash,
      add column email varchar(255) unique,
      add column display_name varchar(255),
      add column avatar_url varchar(255);

    create table auth_identities (
      id uuid primary key default uuidv7(),
      provider varchar(255) not null,
      provider_subject varchar(255) not null,
      user_id uuid not null references users(id) on delete cascade,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint auth_identities_provider_subject_unique unique (provider, provider_subject)
    );

    create index auth_identities_user_id_idx on auth_identities(user_id);

    create trigger auth_identities_set_updated_at
    before update on auth_identities
    for each row
    execute function set_updated_at();
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    drop trigger if exists auth_identities_set_updated_at on auth_identities;
    drop table if exists auth_identities;

    delete from users;

    alter table users
      drop column if exists avatar_url,
      drop column if exists display_name,
      drop column if exists email,
      add column username varchar(255) not null unique,
      add column password_hash text not null;
  `.execute(db);
}
