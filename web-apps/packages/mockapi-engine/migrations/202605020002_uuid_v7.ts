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
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    drop function if exists set_updated_at();
    drop function if exists uuidv7();
  `.execute(db);
}
