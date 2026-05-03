import type { ColumnType } from "kysely";

import type { ProjectVariable } from "../../../domain/entities/project";

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;

export type ProjectsTable = {
  id: ColumnType<string, string | undefined, never>;
  name: string;
  description: string;
  globals: ColumnType<ProjectVariable[], ProjectVariable[] | string, ProjectVariable[] | string>;
  constants: ColumnType<ProjectVariable[], ProjectVariable[] | string, ProjectVariable[] | string>;
  created_at: Timestamp;
  updated_at: Timestamp;
};
