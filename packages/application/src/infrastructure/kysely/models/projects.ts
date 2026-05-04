import type { ColumnType } from "kysely";
import { VariableEt } from "../../../domain/entities/variables";

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;

export type ProjectsTable = {
  id: ColumnType<string, string | undefined, never>;
  name: string;
  description: string;
  globals: ColumnType<
    VariableEt[],
    VariableEt[] | string,
    VariableEt[] | string
  > | null;
  constants: ColumnType<
    VariableEt[],
    VariableEt[] | string,
    VariableEt[] | string
  > | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};
