import type { ColumnType } from "kysely";
import { VariableEt } from "../../../domain/entities/variables";

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;

export type MockApisTable = {
  id: ColumnType<string, string | undefined, never>;
  project_id: string;
  method: string;
  path: string;
  name: string;
  variables: ColumnType<
    VariableEt[],
    VariableEt[] | string,
    VariableEt[] | string
  > | null;
  description: string | null;
  deleted_at: ColumnType<Date | null, Date | string | null | undefined, Date | string | null>;
  created_at: Timestamp;
  updated_at: Timestamp;
};

