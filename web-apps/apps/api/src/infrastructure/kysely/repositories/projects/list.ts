import type { IProjectsRepository } from "../../../../domain/interfaces/repositories/mockapis/projects";
import type { ProjectEt } from "../../../../domain/entities/project";
import type { DatabaseClient } from "../../index";

type ProjectFilters = {
  ids?: string[];
  slug?: string;
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

type ColumnKeys = Extract<keyof ProjectEt, string>;

export const list = (client: DatabaseClient): IProjectsRepository["list"] => {
  async function listProjects(params: {
    filters: ProjectFilters;
    pagination?: ProjectPagination;
    sort?: ProjectSort;
  }): Promise<ProjectEt[]>;
  async function listProjects<C extends readonly ColumnKeys[]>(params: {
    filters: ProjectFilters;
    columns: C;
    pagination?: ProjectPagination;
    sort?: ProjectSort;
  }): Promise<Pick<ProjectEt, C[number]>[]>;
  async function listProjects<C extends readonly ColumnKeys[]>({
    filters,
    columns,
    pagination,
    sort,
  }: {
    filters: ProjectFilters;
    columns?: C;
    pagination?: ProjectPagination;
    sort?: ProjectSort;
  }): Promise<ProjectEt[] | Pick<ProjectEt, C[number]>[]> {
    if (
      !filters.ids?.length &&
      !filters.slug &&
      !filters.name &&
      !filters.description &&
      !pagination
    )
      return [];

    let query = client.db.selectFrom("projects");

    if (columns?.length) {
      query = query.select(columns);
    } else {
      query = query.selectAll();
    }

    if (filters.ids?.length) {
      query = query.where("id", "in", filters.ids);
    }

    if (filters.slug) {
      query = query.where("slug", "=", filters.slug);
    }

    if (filters.name) {
      query = query.where("name", "ilike", `%${filters.name}%`);
    }

    if (filters.description) {
      query = query.where("description", "ilike", `%${filters.description}%`);
    }

    if (sort?.by) {
      query = query.orderBy(sort.by, sort.order);
    }

    if (pagination?.limit) {
      query = query.limit(pagination.limit).offset(pagination.offset);
    }

    const rows = await query.execute();

    return rows as ProjectEt[] | Pick<ProjectEt, ColumnKeys>[];
  }

  return listProjects;
};
