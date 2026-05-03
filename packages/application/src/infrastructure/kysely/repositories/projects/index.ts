import type { IProjectsRepository } from "../../../../domain/entities/interfaces/projects";
import type { DatabaseClient } from "../../index";
import { createProject } from "./create";
import { deleteProject } from "./delete";
import { list } from "./list";
import { updateProject } from "./update";

export const Projects = (client: DatabaseClient): IProjectsRepository => ({
  create: createProject(client),
  list: list(client),
  update: updateProject(client),
  delete: deleteProject(client),
});
