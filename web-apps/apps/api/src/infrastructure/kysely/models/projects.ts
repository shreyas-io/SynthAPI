import type { ColumnType } from "kysely";
import { VariableEt } from "../../../domain/entities/variables";

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;

export type ProjectsTable = {
  id: ColumnType<string, string | undefined, never>;
  organization_id: ColumnType<string, string | undefined, string>;
  created_by_user_id: string;
  slug: string;
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
  deleted_at: ColumnType<Date | null, Date | string | null | undefined, Date | string | null>;
  deleted_by_user_id: ColumnType<string | null, string | null | undefined, string | null>;
  created_at: Timestamp;
  updated_at: Timestamp;
};
