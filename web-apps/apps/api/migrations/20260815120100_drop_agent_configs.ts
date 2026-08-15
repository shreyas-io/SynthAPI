import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table chat_sessions drop column if exists agent_config_id;
  `.execute(db);

  await sql`
    drop trigger if exists agent_configs_set_updated_at on agent_configs;
  `.execute(db);

  await sql`
    drop table if exists agent_configs;
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Best-effort restore of agent_configs in its final shape (post
  // 20260523000200 / 20260531000200 / 20260617000100), re-attached to
  // chat_sessions with the seeded local-default row.
  await sql`
    create table agent_configs (
      id uuid primary key default uuidv7(),
      key varchar(128) not null unique,
      name varchar(255) not null,
      description text,
      pricing_config jsonb not null default '{}'::jsonb,
      chat_config jsonb not null,
      compaction_config jsonb,
      compaction_threshold_tokens integer,
      enabled boolean not null default true,
      version integer not null default 1,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `.execute(db);

  await sql`
    create trigger agent_configs_set_updated_at
    before update on agent_configs
    for each row execute function set_updated_at();
  `.execute(db);

  await sql`
    insert into agent_configs (
      key, name, description, pricing_config, chat_config,
      compaction_config, compaction_threshold_tokens, enabled, version
    )
    values (
      'local-default',
      'Local Default Agent',
      null,
      '{}'::jsonb,
      '{}'::jsonb,
      null,
      null,
      true,
      30
    );
  `.execute(db);

  await sql`
    alter table chat_sessions add column agent_config_id uuid;
  `.execute(db);

  await sql`
    update chat_sessions
    set agent_config_id = (select id from agent_configs where key = 'local-default')
    where agent_config_id is null;
  `.execute(db);

  await sql`
    alter table chat_sessions
    alter column agent_config_id set not null,
    add constraint chat_sessions_agent_config_id_fkey
      foreign key (agent_config_id) references agent_configs(id);
  `.execute(db);

  await sql`
    create index chat_sessions_agent_config_id_idx on chat_sessions(agent_config_id);
  `.execute(db);
}
