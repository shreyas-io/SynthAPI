import type { ColumnType } from "kysely";

export type ChatTurnBlobsTable = {
  id: ColumnType<string, string | undefined, never>;
  mime_type: string;
  size_bytes: number;
  content: Buffer;
  created_at: ColumnType<Date, Date | string | undefined, never>;
};
