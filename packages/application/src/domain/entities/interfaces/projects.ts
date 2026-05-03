import type {
  CreateProjectInput,
  Project,
  UpdateProjectInput,
} from "../project";

type ProjectColumn = keyof Project;
type ProjectSelectedColumns<Columns extends readonly ProjectColumn[]> = Pick<
  Project,
  Columns[number]
>;

export interface IProjectsRepository {
  create: (input: CreateProjectInput) => Promise<void>;
  list: {
    (
      filters: {
        ids?: string[];
        name?: string;
        description?: string;
      },
      pagination: {
        limit: number;
        offset: number;
      },
      sort: {
        by: "name" | "created_at";
        order: "asc" | "desc";
      },
    ): Promise<Project[]>;
    <Columns extends readonly ProjectColumn[]>(
      filters: {
        ids?: string[];
        name?: string;
        description?: string;
      },
      pagination: {
        limit: number;
        offset: number;
      },
      sort: {
        by: "name" | "created_at";
        order: "asc" | "desc";
      },
      columns: Columns,
    ): Promise<ProjectSelectedColumns<Columns>[]>;
  };
  update: (id: string, input: UpdateProjectInput) => Promise<void>;
  delete: (id: string) => Promise<void>;
}
