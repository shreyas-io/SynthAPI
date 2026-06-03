import { sql } from "kysely";

import type { IProjectsRepository } from "../../../../domain/interfaces/repositories/mockapis/projects";
import type { DatabaseClient } from "../../index";

type ProjectFilters = {
  ids?: string[];
  organization_ids?: string[];
  slug?: string;
  name?: string;
  description?: string;
};

export const count =
  (client: DatabaseClient): IProjectsRepository["count"] =>
  async ({
    filters,
    pagination,
  }: {
    filters: ProjectFilters;
    pagination?: {
      limit: number;
      offset: number;
    };
  }): Promise<number> => {
    if (
      !filters.ids?.length &&
      !filters.organization_ids?.length &&
      !filters.slug &&
      !filters.name &&
      !filters.description &&
      !pagination
    )
      return 0;

    let query = client.db
      .selectFrom("projects")
      .select(sql<number>`count(*)::int`.as("count"));

    if (filters.ids?.length) {
      query = query.where("id", "in", filters.ids);
    }

    if (filters.organization_ids?.length) {
      query = query.where("organization_id", "in", filters.organization_ids);
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

    const row = await query.executeTakeFirstOrThrow();

    return row.count;
  };
