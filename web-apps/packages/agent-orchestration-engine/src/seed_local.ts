import { parseEnvironment } from "./environment";
import { createPostgresDatabase } from "./infrastructure/kysely";

const environment = parseEnvironment(process.env as any);
const database = createPostgresDatabase({ app: { environment } });

try {
  const existing = await database.db
    .selectFrom("agent_configs")
    .select("id")
    .where("key", "=", "local-default")
    .executeTakeFirst();

  if (!existing) {
    await database.db
      .insertInto("agent_configs")
      .values({
        key: "local-default",
        name: "Local Default Agent",
        description: "Default agent config for local development",
        pricing_config: JSON.stringify({}),
        chat_config: JSON.stringify({
          model_host: "openrouter",
          model_provider: "google",
          model_gateway: null,
          model_id: "google/gemma-4-26b-a4b-it",
          system_prompt:
            "You are a helpful assistant for managing mock APIs and projects.",
          input_messages: [],
          tools: [],
          custom_tools: [],
          temperature: 0.2,
          max_tokens: 2048,
        }),
        chat_fallback_config: JSON.stringify({
          model_host: "openrouter",
          model_provider: "google",
          model_gateway: null,
          model_id: "google/gemma-4-26b-a4b-it",
          system_prompt:
            "You are a helpful assistant for managing mock APIs and projects.",
          input_messages: [],
          tools: [],
          custom_tools: [],
          temperature: 0.2,
          max_tokens: 2048,
        }),
        planning_config: JSON.stringify({
          model_host: "openrouter",
          model_provider: "google",
          model_gateway: null,
          model_id: "google/gemma-4-26b-a4b-it",
          system_prompt:
            "You are a planning assistant. You help users plan and understand their mock API setup. You have read-only access to projects and mock APIs.",
          input_messages: [],
          tools: [],
          custom_tools: [],
          temperature: 0.1,
          max_tokens: 2048,
        }),
        compaction_config: JSON.stringify({
          model_host: "openrouter",
          model_provider: "google",
          model_gateway: null,
          model_id: "google/gemma-4-26b-a4b-it",
          system_prompt:
            "You are a context compaction assistant. Summarize the conversation so far.",
          input_messages: [],
          tools: [],
          custom_tools: [],
          temperature: 0.1,
          max_tokens: 1024,
        }),
        compaction_threshold_tokens: 4096,
        enabled: true,
      })
      .execute();

    console.log("Seeded local-default agent config.");
  } else {
    console.log("local-default agent config already exists.");
  }
} finally {
  await database.destroy();
}
