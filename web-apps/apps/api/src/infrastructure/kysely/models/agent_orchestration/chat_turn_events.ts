import type { ColumnType } from "kysely";
import type { JsonValue } from "./shared";

export type ChatTurnEventsTable = {
  id: ColumnType<string, string | undefined, never>;
  chat_turn_id: string;
  sequence: number;
  event_type: string;
  payload: ColumnType<JsonValue, JsonValue | string, JsonValue | string>;
  created_at: ColumnType<Date, Date | string | undefined, never>;
};
