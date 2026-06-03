import { ProjectsUsecase } from "../../mock_api/projects";
import { toolDefinitions } from "./definitions";
import {
  emptyToolInputDto,
  listProjectsToolInputDto,
  updateProjectConstantsToolInputDto,
  updateProjectGlobalsToolInputDto,
} from "./schemas";
import type { ITool } from "./types";
import { assertProject, toJson } from "./utils";

export const projectTools = {
  list_projects: {
    definition: toolDefinitions.list_projects,
    async execute(ctx, _workspace, input) {
      const parsed = listProjectsToolInputDto.parse(input ?? {});
      const projects = ProjectsUsecase(ctx);

      return toJson(
        await projects.getProjects(
          _workspace.user,
          {},
          { limit: parsed.limit, offset: parsed.offset },
          { by: "created_at", order: "desc" },
        ),
      );
    },
  },
  get_project: {
    definition: toolDefinitions.get_project,
    async execute(ctx, workspace, input) {
      emptyToolInputDto.parse(input ?? {});
      const projects = ProjectsUsecase(ctx);

      return toJson(
        assertProject(
          await projects.getProject(workspace.user, workspace.project_id),
          workspace.project_id,
        ),
      );
    },
  },
  update_project_globals: {
    definition: toolDefinitions.update_project_globals,
    async execute(ctx, workspace, input) {
      const parsed = updateProjectGlobalsToolInputDto.parse(input);
      const projects = ProjectsUsecase(ctx);
      const project = assertProject(
        await projects.getProject(workspace.user, workspace.project_id),
        workspace.project_id,
      );

      await projects.updateProject(workspace.user, project.id, {
        name: project.name,
        description: project.description,
        globals: parsed.globals as any,
        constants: project.constants,
      });

      return toJson(await projects.getProject(workspace.user, project.id));
    },
  },
  update_project_constants: {
    definition: toolDefinitions.update_project_constants,
    async execute(ctx, workspace, input) {
      const parsed = updateProjectConstantsToolInputDto.parse(input);
      const projects = ProjectsUsecase(ctx);
      const project = assertProject(
        await projects.getProject(workspace.user, workspace.project_id),
        workspace.project_id,
      );

      await projects.updateProject(workspace.user, project.id, {
        name: project.name,
        description: project.description,
        globals: project.globals,
        constants: parsed.constants as any,
      });

      return toJson(await projects.getProject(workspace.user, project.id));
    },
  },
} satisfies Pick<
  Record<string, ITool>,
  | "list_projects"
  | "get_project"
  | "update_project_globals"
  | "update_project_constants"
>;
