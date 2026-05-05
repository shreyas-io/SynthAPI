import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    create extension if not exists pgcrypto;

    create or replace function uuidv7()
    returns uuid
    language plpgsql
    volatile
    as $$
    declare
      unix_ts_ms bytea;
      random_bytes bytea;
    begin
      unix_ts_ms = substring(int8send((extract(epoch from clock_timestamp()) * 1000)::bigint) from 3);
      random_bytes = gen_random_bytes(10);
      random_bytes = set_byte(random_bytes, 0, (112 | (get_byte(random_bytes, 0) & 15)));
      random_bytes = set_byte(random_bytes, 2, (128 | (get_byte(random_bytes, 2) & 63)));

      return encode(unix_ts_ms || random_bytes, 'hex')::uuid;
    end;
    $$;

    create or replace function set_updated_at()
    returns trigger
    language plpgsql
    as $$
    begin
      new.updated_at = now();
      return new;
    end;
    $$;
  `.execute(db);

  await db.schema
    .createTable("users")
    .addColumn("id", "uuid", (column) =>
      column.primaryKey().defaultTo(sql`uuidv7()`),
    )
    .addColumn("username", "text", (column) => column.notNull().unique())
    .addColumn("password_hash", "text", (column) => column.notNull())
    .addColumn("created_at", "timestamptz", (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn("updated_at", "timestamptz", (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createTable("authorized_sessions")
    .addColumn("id", "uuid", (column) =>
      column.primaryKey().defaultTo(sql`uuidv7()`),
    )
    .addColumn("user_id", "uuid", (column) =>
      column.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("token_prefix", "text", (column) => column.notNull())
    .addColumn("token_suffix", "text", (column) => column.notNull())
    .addColumn("token_hash", "text", (column) => column.notNull())
    .addColumn("expires_at", "timestamptz", (column) => column.notNull())
    .addColumn("created_at", "timestamptz", (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn("updated_at", "timestamptz", (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addUniqueConstraint("authorized_sessions_token_unique", [
      "token_prefix",
      "token_suffix",
      "token_hash",
    ])
    .execute();

  await db.schema
    .createIndex("authorized_sessions_token_lookup_idx")
    .on("authorized_sessions")
    .columns(["token_prefix", "token_suffix", "expires_at"])
    .execute();

  await sql`
    create trigger users_set_updated_at
    before update on users
    for each row
    execute function set_updated_at();

    create trigger authorized_sessions_set_updated_at
    before update on authorized_sessions
    for each row
    execute function set_updated_at();
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    drop trigger if exists authorized_sessions_set_updated_at on authorized_sessions;
    drop trigger if exists users_set_updated_at on users;
  `.execute(db);

  await db.schema.dropTable("authorized_sessions").ifExists().execute();
  await db.schema.dropTable("users").ifExists().execute();

  await sql`
    drop function if exists set_updated_at();
    drop function if exists uuidv7();
  `.execute(db);
}
