import type { ColumnType } from "kysely";

export type Timestamp = ColumnType<
  Date,
  Date | string | undefined,
  Date | string
>;

export type JsonValue = Record<string, any>;
