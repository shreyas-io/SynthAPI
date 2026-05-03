import { AppContext } from "../..";
import { ProjectsUsecase } from "../../domain/usecases/projects";
import {
  createProjectDto,
  listProjectsFilterDto,
  listProjectsPaginationDto,
  listProjectsSortDto,
} from "../dto/projects";
import { MockApiException } from "../../exceptions/exception";

export function Projects(ctx: AppContext) {
  const projects = ProjectsUsecase(ctx);
  return {
    createProject: (data: unknown) =>
      projects.createProject(createProjectDto.parse(data)),
    listProjects: (filters: unknown, pagination: unknown, sort: unknown) => {
      const {
        data: f,
        success: s_0,
        error: e_0,
      } = listProjectsFilterDto.safeParse(filters);
      if (!s_0)
        throw new MockApiException({
          public_message: JSON.stringify(e_0.issues),
        });

      const {
        data: p,
        success: s_1,
        error: e_1,
      } = listProjectsPaginationDto.safeParse(pagination);
      if (!s_1)
        throw new MockApiException({
          public_message: JSON.stringify(e_1.issues),
        });

      const {
        data: s,
        success: s_2,
        error: e_2,
      } = listProjectsSortDto.safeParse(sort);
      if (!s_2)
        throw new MockApiException({
          public_message: JSON.stringify(e_2.issues),
        });

      return projects.getProjects(f, p, s);
    },
    deleteProject: (id: string) => projects.deleteProject(id),
    updateProject: (id: string, data: unknown) =>
      projects.updateProject(id, createProjectDto.parse(data)),
  };
}
