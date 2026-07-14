import type { ColumnType } from "kysely";

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;

export type ContactMessagesTable = {
  id: ColumnType<string, string | undefined, never>;
  name: string;
  email: string;
  company: string | null;
  message: string;
  source: string | null;
  created_at: Timestamp;
};