import type { IProjectsRepository } from "../../../../domain/entities/interfaces/projects";
import type { Project } from "../../../../domain/entities/project";
import type { DatabaseClient } from "../../index";

type ProjectFilters = {
  ids?: string[];
  name?: string;
  description?: string;
};

type ProjectPagination = {
  limit: number;
  offset: number;
};

type ProjectSort = {
  by: "name" | "created_at";
  order: "asc" | "desc";
};

type ColumnKeys = keyof Project;

export const list = (client: DatabaseClient): IProjectsRepository["list"] => {
  async function listProjects(
    filters: ProjectFilters,
    pagination: ProjectPagination,
    sort: ProjectSort,
  ): Promise<Project[]>;
  async function listProjects<C extends readonly ColumnKeys[]>(
    filters: ProjectFilters,
    pagination: ProjectPagination,
    sort: ProjectSort,
    columns: ColumnKeys,
  ): Promise<Pick<Project, C[number]>[]>;
  async function listProjects<C extends readonly ColumnKeys[]>(
    filters: ProjectFilters,
    pagination: ProjectPagination,
    sort: ProjectSort,
    columns?: C,
  ): Promise<Project[] | Pick<Project, C[number]>[]> {
    let query = client.db.selectFrom("projects");

    if (columns?.length) {
      query = query.select(columns);
    } else {
      query = query.selectAll();
    }

    if (filters.ids?.length) {
      query = query.where("id", "in", filters.ids);
    }

    if (filters.name) {
      query = query.where("name", "ilike", `%${filters.name}%`);
    }

    if (filters.description) {
      query = query.where("description", "ilike", `%${filters.description}%`);
    }

    const rows = await query
      .orderBy(sort.by, sort.order)
      .limit(pagination.limit)
      .offset(pagination.offset)
      .execute();

    return rows as Project[] | Pick<Project, ColumnKeys>[];
  }

  return listProjects;
};
