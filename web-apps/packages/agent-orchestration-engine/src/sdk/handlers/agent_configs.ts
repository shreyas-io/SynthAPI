import type { AppContext } from "../..";
import { AgentConfigsRepository } from "../../infrastructure/kysely/repositories/agent_configs";
import { AgentOrchestrationException } from "../../exceptions/exception";
import {
  createAgentConfigDto,
  listAgentConfigsFilterDto,
  listAgentConfigsPaginationDto,
  listAgentConfigsSortDto,
  updateAgentConfigDto,
} from "../dto/agent_configs";

export function AgentConfigs(ctx: AppContext) {
  const agent_configs = AgentConfigsRepository(ctx.database);

  return {
    createAgentConfig: (data: unknown) => {
      const { data: v, success, error } = createAgentConfigDto.safeParse(data);

      if (!success)
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(error.issues),
        });

      return agent_configs.create(v);
    },
    listAgentConfigs: (filters: unknown, pagination: unknown, sort: unknown) => {
      const {
        data: f,
        success: s_0,
        error: e_0,
      } = listAgentConfigsFilterDto.safeParse(filters);
      if (!s_0)
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(e_0.issues),
        });

      const {
        data: p,
        success: s_1,
        error: e_1,
      } = listAgentConfigsPaginationDto.safeParse(pagination);
      if (!s_1)
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(e_1.issues),
        });

      const {
        data: s,
        success: s_2,
        error: e_2,
      } = listAgentConfigsSortDto.safeParse(sort);
      if (!s_2)
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(e_2.issues),
        });

      return agent_configs.list({ filters: f, pagination: p, sort: s });
    },
    countAgentConfigs: (filters: unknown) => {
      const { data: f, success, error } =
        listAgentConfigsFilterDto.safeParse(filters);

      if (!success)
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(error.issues),
        });

      return agent_configs.count({ filters: f });
    },
    updateAgentConfig: (id: string, data: unknown) => {
      const { data: v, success, error } = updateAgentConfigDto.safeParse(data);

      if (!success)
        throw new AgentOrchestrationException({
          public_message: JSON.stringify(error.issues),
        });

      return agent_configs.update(id, v);
    },
    deleteAgentConfig: (id: string) => agent_configs.delete(id),
  };
}
