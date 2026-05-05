import { randomBytes } from "node:crypto";

import { AppContext } from "../..";
import { ProjectsUsecase } from "../../domain/usecases/projects";
import {
  createProjectDto,
  listProjectsFilterDto,
  listProjectsPaginationDto,
  listProjectsSortDto,
} from "../dto/projects";
import { MockApiException } from "../../exceptions/exception";

type ProjectFilters = {
  ids?: string[];
  slug?: string;
  name?: string;
  description?: string;
};

const getSlugBase = (name: string): string => {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 244);

  return slug || "project";
};

const getProjectSlug = (name: string): string => {
  return `${getSlugBase(name)}-${randomBytes(5).toString("hex")}`;
};

export function Projects(ctx: AppContext) {
  const projects = ProjectsUsecase(ctx);
  return {
    createProject: (data: unknown) => {
      const { data: v, success, error } = createProjectDto.safeParse(data);

      if (!success)
        throw new MockApiException({
          public_message: JSON.stringify(error.issues),
        });

      return projects.createProject({
        slug: getProjectSlug(v.name),
        name: v.name,
        description: v.description,
        globals: v.globals ?? null,
        constants: v.constants ?? null,
      });
    },
    getProject: (id: string) => projects.getProject(id),
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

      const projectFilters: ProjectFilters = {};

      if (f.ids?.length) {
        projectFilters.ids = f.ids;
      }

      if (f.slug) {
        projectFilters.slug = f.slug;
      }

      if (f.name) {
        projectFilters.name = f.name;
      }

      if (f.description) {
        projectFilters.description = f.description;
      }

      return projects.getProjects(projectFilters, p, s);
    },
    deleteProject: (id: string) => projects.deleteProject(id),
    updateProject: async (id: string, data: unknown) => {
      const { data: v, success, error } = createProjectDto.safeParse(data);

      if (!success)
        throw new MockApiException({
          public_message: JSON.stringify(error.issues),
        });

      await projects.updateProject(id, {
        name: v.name,
        description: v.description,
        globals: v.globals ?? null,
        constants: v.constants ?? null,
      });
    },
  };
}
