import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    create table agent_configs (
      id uuid primary key default uuidv7(),
      key varchar(128) not null unique,
      name varchar(255) not null,
      description text,
      pricing_config jsonb not null default '{}'::jsonb,
      chat_config jsonb not null,
      chat_fallback_config jsonb not null,
      planning_config jsonb not null,
      enabled boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table chat_sessions (
      id uuid primary key default uuidv7(),
      agent_config_id uuid not null references agent_configs(id),
      status varchar(32) not null default 'active',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table chat_turn_blobs (
      id uuid primary key default uuidv7(),
      mime_type varchar(255) not null,
      size_bytes integer not null,
      content bytea not null,
      created_at timestamptz not null default now()
    );

    create table chat_session_turns (
      id uuid primary key default uuidv7(),
      chat_session_id uuid not null references chat_sessions(id) on delete cascade,
      mode varchar(32) not null,
      user_input jsonb not null,
      conversation_context jsonb,
      status varchar(32) not null default 'in_progress',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table chat_turn_events (
      id uuid primary key default uuidv7(),
      chat_turn_id uuid not null references chat_session_turns(id) on delete cascade,
      sequence integer not null,
      event_type varchar(64) not null,
      payload jsonb not null,
      created_at timestamptz not null default now(),
      constraint chat_turn_events_turn_sequence_unique unique (chat_turn_id, sequence)
    );

    create index chat_sessions_agent_config_id_idx on chat_sessions(agent_config_id);
    create index chat_session_turns_session_id_idx on chat_session_turns(chat_session_id);
    create index chat_turn_events_turn_id_idx on chat_turn_events(chat_turn_id);

    create trigger agent_configs_set_updated_at
    before update on agent_configs
    for each row
    execute function set_updated_at();

    create trigger chat_sessions_set_updated_at
    before update on chat_sessions
    for each row
    execute function set_updated_at();

    create trigger chat_session_turns_set_updated_at
    before update on chat_session_turns
    for each row
    execute function set_updated_at();
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    drop trigger if exists chat_session_turns_set_updated_at on chat_session_turns;
    drop trigger if exists chat_sessions_set_updated_at on chat_sessions;
    drop trigger if exists agent_configs_set_updated_at on agent_configs;

    drop table if exists chat_turn_events;
    drop table if exists chat_session_turns;
    drop table if exists chat_turn_blobs;
    drop table if exists chat_sessions;
    drop table if exists agent_configs;
  `.execute(db);
}
