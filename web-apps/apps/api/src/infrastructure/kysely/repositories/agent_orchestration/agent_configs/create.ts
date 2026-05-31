import { uuidv7 } from "uuidv7";

import type { AgentConfigEt } from "../../../../../domain/entities/agent_orchestration/agent_config";
import type { DatabaseClient } from "../../../index";

type AgentConfigInput = Omit<AgentConfigEt, "id" | "created_at" | "updated_at">;

export const createAgentConfig =
  (client: DatabaseClient) =>
  async (input: AgentConfigInput, id?: string): Promise<string> => {
    const recordId = id ?? uuidv7();

    await client.db
      .insertInto("agent_configs")
      .values({
        id: recordId,
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
        version: input.version,
      })
      .executeTakeFirstOrThrow();

    return recordId;
  };
