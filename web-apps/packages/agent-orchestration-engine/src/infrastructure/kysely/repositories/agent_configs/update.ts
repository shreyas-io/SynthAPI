import type { AgentConfigEt } from "../../../../domain/entities/agent_config";
import type { DatabaseClient } from "../../index";

type AgentConfigInput = Omit<AgentConfigEt, "id" | "created_at" | "updated_at">;

export const updateAgentConfig =
  (client: DatabaseClient) =>
  async (id: string, input: AgentConfigInput): Promise<void> => {
    await client.db
      .updateTable("agent_configs")
      .set({
        key: input.key,
        name: input.name,
        description: input.description,
        pricing_config: JSON.stringify(input.pricing_config),
        chat_config: JSON.stringify(input.chat_config),
        chat_fallback_config: JSON.stringify(input.chat_fallback_config),
        planning_config: JSON.stringify(input.planning_config),
        compaction_config: JSON.stringify(
          input.compaction_config ?? input.planning_config,
        ),
        compaction_threshold_tokens: input.compaction_threshold_tokens ?? 0,
        enabled: input.enabled,
      })
      .where("id", "=", id)
      .execute();
  };
