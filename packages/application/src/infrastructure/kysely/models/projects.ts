import type { ColumnType } from "kysely";

import type { ProjectVariableEt } from "../../../domain/entities/project";

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;

export type ProjectsTable = {
  id: ColumnType<string, string | undefined, never>;
  name: string;
  description: string;
  globals: ColumnType<
    ProjectVariableEt[],
    ProjectVariableEt[] | string,
    ProjectVariableEt[] | string
  >;
  constants: ColumnType<
    ProjectVariableEt[],
    ProjectVariableEt[] | string,
    ProjectVariableEt[] | string
  >;
  created_at: Timestamp;
  updated_at: Timestamp;
};
