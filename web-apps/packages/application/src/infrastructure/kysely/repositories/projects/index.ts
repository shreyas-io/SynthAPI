import type { IProjectsRepository } from "../../../../domain/entities/interfaces/repositories/projects";
import type { DatabaseClient } from "../../index";
import { count } from "./count";
import { createProject } from "./create";
import { deleteProject } from "./delete";
import { list } from "./list";
import { updateProject } from "./update";

export const ProjectsRepository = (
  client: DatabaseClient,
): IProjectsRepository => ({
  count: count(client),
  create: createProject(client),
  list: list(client),
  update: updateProject(client),
  delete: deleteProject(client),
});
