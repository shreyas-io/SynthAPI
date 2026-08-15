import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    create table agent_runtime_config (
      id uuid primary key default uuidv7(),
      agent_config jsonb not null,
      compaction_config jsonb not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `.execute(db);

  await sql`
    create trigger agent_runtime_config_set_updated_at
    before update on agent_runtime_config
    for each row execute function set_updated_at();
  `.execute(db);

  // Model and pricing values are intentionally minimal — configure them
  // manually in each environment's DB. They are not stored in the repo.
  await sql`
    insert into agent_runtime_config (id, agent_config, compaction_config)
    values (
      '01a00681-1989-7618-aa2f-d04659cfd41b',
      ${JSON.stringify({
        reasoning: { effort: "medium" },
        models: [
          {
            priority: 0,
            provider: "openrouter",
            model: "nvidia/nemotron-3-super-120b-a12b:free",
            temperature: 0.2,
            max_tokens: 30720,
            pricing: { input_tokens: 0, output_tokens: 0 },
          },
          {
            priority: 1,
            provider: "openrouter",
            model: "openai/gpt-oss-20b:free",
            temperature: 0.2,
            max_tokens: 30720,
            pricing: { input_tokens: 0, output_tokens: 0 },
          },
        ],
      })},
      ${JSON.stringify({
        enabled: true,
        threshold_tokens: 300000,
        reasoning: { effort: "low" },
        models: [
          {
            priority: 0,
            provider: "openrouter",
            model: "nvidia/nemotron-3-super-120b-a12b:free",
            temperature: 0.2,
            max_tokens: 10240,
            pricing: { input_tokens: 0, output_tokens: 0 },
          },
          {
            priority: 1,
            provider: "openrouter",
            model: "openai/gpt-oss-20b:free",
            temperature: 0.2,
            max_tokens: 10240,
            pricing: { input_tokens: 0, output_tokens: 0 },
          },
        ],
      })}
    );
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    drop trigger if exists agent_runtime_config_set_updated_at on agent_runtime_config;
  `.execute(db);

  await sql`
    drop table if exists agent_runtime_config;
  `.execute(db);
}
