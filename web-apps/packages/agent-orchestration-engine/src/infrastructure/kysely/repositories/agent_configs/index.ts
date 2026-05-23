import type { IAgentConfigsRepository } from "../../../../domain/entities/interfaces/repositories/agent_configs";
import type { DatabaseClient } from "../../index";
import { count } from "./count";
import { createAgentConfig } from "./create";
import { deleteAgentConfig } from "./delete";
import { list } from "./list";
import { updateAgentConfig } from "./update";

export const AgentConfigsRepository = (
  client: DatabaseClient,
): IAgentConfigsRepository => ({
  count: count(client),
  create: createAgentConfig(client),
  list: list(client),
  update: updateAgentConfig(client),
  delete: deleteAgentConfig(client),
});
