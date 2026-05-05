import type { ProjectEt } from "../../project";

type ProjectInput = Pick<
  ProjectEt,
  "slug" | "name" | "description" | "globals" | "constants"
>;
type ColumnKeys = Extract<keyof ProjectEt, string>;

export interface IProjectsRepository {
  count: (params: {
    filters: {
      ids?: string[];
      slug?: string;
      name?: string;
      description?: string;
    };
  }) => Promise<number>;
  create: (input: ProjectInput) => Promise<string>;
  list: {
    (params: {
      filters: {
        ids?: string[];
        slug?: string;
        name?: string;
        description?: string;
      };
      pagination?: {
        limit: number;
        offset: number;
      };
      sort?: {
        by: "name" | "created_at";
        order: "asc" | "desc";
      };
    }): Promise<ProjectEt[]>;
    <C extends readonly ColumnKeys[]>(params: {
      filters: {
        ids?: string[];
        slug?: string;
        name?: string;
        description?: string;
      };
      columns: C;
      pagination?: {
        limit: number;
        offset: number;
      };
      sort?: {
        by: "name" | "created_at";
        order: "asc" | "desc";
      };
    }): Promise<Pick<ProjectEt, C[number]>[]>;
  };
  update: (id: string, input: ProjectInput) => Promise<void>;
  delete: (id: string) => Promise<void>;
}
