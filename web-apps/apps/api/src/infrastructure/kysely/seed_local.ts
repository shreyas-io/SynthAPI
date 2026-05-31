import argon2 from "argon2";

import { getSecrets } from "../../config/secrets";
import { createApiGatewayDatabase } from "./index";

const username = "test";
const password = "password";

const secrets = await getSecrets();
const database = createApiGatewayDatabase(secrets);

try {
  const existing = await database.db
    .selectFrom("users")
    .select("id")
    .where("username", "=", username)
    .executeTakeFirst();

  if (!existing) {
    await database.db
      .insertInto("users")
      .values({
        username,
        password_hash: await argon2.hash(password, { type: argon2.argon2id }),
      })
      .execute();
  }

  const existing_agent_config = await database.db
    .selectFrom("agent_configs")
    .select("id")
    .where("key", "=", "local-default")
    .executeTakeFirst();

  if (!existing_agent_config) {
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
  }
} finally {
  await database.destroy();
}
